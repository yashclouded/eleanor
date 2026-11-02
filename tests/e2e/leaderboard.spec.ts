import { test, expect, type Page } from './fixtures.ts'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const testSql = postgres(
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  { prepare: false, max: 2 }
)

const MAILPIT_URL = process.env.MAILPIT_URL || 'http://127.0.0.1:54324'

interface MailpitMessageSummary {
  ID: string
  To?: { Address?: string }[]
}

interface MailpitMessagesResponse {
  messages?: MailpitMessageSummary[]
}

async function getMagicLinkForEmail(email: string, maxAttempts = 20): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages`)
    const data = (await res.json()) as MailpitMessagesResponse
    const msgMeta = (data.messages || []).find((m) =>
      m.To?.some((t) => t.Address?.toLowerCase() === email.toLowerCase())
    )

    if (msgMeta) {
      const detailRes = await fetch(`${MAILPIT_URL}/api/v1/message/${msgMeta.ID}`)
      const detail = await detailRes.json()
      const body = detail.Text || detail.HTML || ''

      const match = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/i)
      if (match) {
        return match[0].replace(/&amp;/g, '&')
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Magic link for email ${email} not found in Mailpit after ${maxAttempts} attempts`)
}

async function createAuthUser(email: string, handle: string, leaderboardVisible = true) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`)
  }
  const userId = data.user.id

  await testSql`
    insert into profiles (
      id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at,
      leaderboard_visible, intensity, set_size, rating_reveal, weekly_goal, tracks
    ) values (
      ${userId}, ${handle}, now(), now(), now(),
      ${leaderboardVisible}, 'balanced', 3, 'end_of_set', 3, '{logic,judgment}'::text[]
    )
  `
  return userId
}

async function loginUser(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.getByRole('button', { name: 'Send magic link' }).click()
  await expect(page.getByTestId('check-email-state')).toBeVisible()

  const magicLink = await getMagicLinkForEmail(email)
  await page.goto(magicLink)
  await page.waitForURL('**/today')
}

test.describe('Task 4.5: Leaderboards and Public Profiles', () => {
  let userTopId: string
  let userTopHandle: string
  let userMidId: string
  let userMidHandle: string
  let userLowId: string
  let userLowHandle: string
  let userHiddenId: string
  let userHiddenHandle: string

  test.beforeAll(async () => {
    const timestamp = Date.now().toString(36).slice(-5)
    userTopHandle = `top_${timestamp}_${Math.random().toString(36).slice(2, 5)}`
    userMidHandle = `mid_${timestamp}_${Math.random().toString(36).slice(2, 5)}`
    userLowHandle = `low_${timestamp}_${Math.random().toString(36).slice(2, 5)}`
    userHiddenHandle = `hid_${timestamp}_${Math.random().toString(36).slice(2, 5)}`

    // Create 3 eligible users and 1 hidden user
    userTopId = await createAuthUser(`top_${timestamp}@test.com`, userTopHandle, true)
    userMidId = await createAuthUser(`mid_${timestamp}@test.com`, userMidHandle, true)
    userLowId = await createAuthUser(`low_${timestamp}@test.com`, userLowHandle, true)
    userHiddenId = await createAuthUser(`hid_${timestamp}@test.com`, userHiddenHandle, false)

    // Seed track ratings for logic track:
    // userTop: rating 1800, rd 60, n 25
    // userMid: rating 1650, rd 70, n 22
    // userLow: rating 1500, rd 80, n 20
    // userHidden: rating 1900, rd 50, n 30 (hidden profile)
    await testSql`
      insert into track_ratings (user_id, track_id, rating, rd, n, peak, last_at)
      values
        (${userTopId}, 'logic', 1800, 60, 25, 1800, now()),
        (${userMidId}, 'logic', 1650, 70, 22, 1650, now()),
        (${userLowId}, 'logic', 1500, 80, 20, 1500, now()),
        (${userHiddenId}, 'logic', 1900, 50, 30, 1900, now())
      on conflict (user_id, track_id) do update
      set rating = excluded.rating, rd = excluded.rd, n = excluded.n, peak = excluded.peak, last_at = now()
    `

    // Insert instance, attempt, and rating events for userTop
    const instId = crypto.randomUUID()
    const attemptId = crypto.randomUUID()
    await testSql`
      insert into instances (id, item_id, seed, skin, prompt, answer_spec)
      values (${instId}, 'logic.knights.two@1#1', 999, 'default', '[]'::jsonb, '{"kind":"multi"}'::jsonb)
      on conflict (id) do nothing
    `
    await testSql`
      insert into attempts (
        id, user_id, kind, rated, state, track_id, concept_id, family_id,
        item_id, instance_id, answer, confidence, outcome, presented_at, resolved_at
      ) values (
        ${attemptId}, ${userTopId}, 'selected', true, 'resolved', 'logic', 'logic.knights', 'fam_logic',
        'logic.knights.two@1#1', ${instId}, '["SECRET_ANSWER_NEVER_LEAK_99999"]'::jsonb, 0.9, 'correct',
        now() - interval '1 hour', now() - interval '50 minutes'
      )
      on conflict (id) do nothing
    `

    // Add rating events for userTop to populate rating chart history
    await testSql`
      insert into rating_events (
        attempt_id, user_id, subject_id, subject_type, r_before, rd_before, r_after, rd_after, expected, score, model_version, created_at
      ) values
        (${attemptId}, ${userTopId}, 'logic', 'track', 1700, 70, 1750, 65, 0.6, 1, 'erm-1', now() - interval '2 days'),
        (${attemptId}, ${userTopId}, 'logic', 'track', 1750, 65, 1800, 60, 0.6, 1, 'erm-1', now() - interval '1 day')
    `

    // Add a secret playbook note for userTop
    const noteId = crypto.randomUUID()
    await testSql`
      insert into playbook (id, user_id, attempt_id, concept_id, text)
      values (${noteId}, ${userTopId}, ${attemptId}, 'logic.knights', 'SECRET_PLAYBOOK_NOTE_DO_NOT_LEAK_12345')
      on conflict (id) do update set text = excluded.text
    `

    // Refresh the materialized view public.leaderboard
    await testSql`refresh materialized view public.leaderboard`
  })

  test('signed out: leaderboard shows 3 eligible users in rating order and excludes hidden user', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/leaderboard/logic')

    // Verify leaderboard table is visible
    const table = page.locator('[data-testid="leaderboard-table"]')
    await expect(table).toBeVisible()

    // Assert handles appear in descending rating order
    const text = await table.textContent()
    expect(text).toContain(userTopHandle)
    expect(text).toContain(userMidHandle)
    expect(text).toContain(userLowHandle)
    expect(text).not.toContain(userHiddenHandle)

    // Verify ordering
    const topIndex = text!.indexOf(userTopHandle)
    const midIndex = text!.indexOf(userMidHandle)
    const lowIndex = text!.indexOf(userLowHandle)

    expect(topIndex).toBeLessThan(midIndex)
    expect(midIndex).toBeLessThan(lowIndex)

    // Verify handles link to /u/:handle
    const topLink = page.locator(`a[href="/u/${userTopHandle}"]`)
    await expect(topLink).toBeVisible()
  })

  test('signed in provisional user sees "provisional, N more rated problems needed"', async ({ page }) => {
    // Create a provisional user with n = 5 in logic
    const provTimestamp = Date.now().toString(36).slice(-5)
    const provEmail = `prov_${provTimestamp}@test.com`
    const provHandle = `prov_${provTimestamp}`
    const provUserId = await createAuthUser(provEmail, provHandle, true)

    await testSql`
      insert into track_ratings (user_id, track_id, rating, rd, n, peak, last_at)
      values (${provUserId}, 'logic', 1400, 150, 5, 1400, now())
      on conflict (user_id, track_id) do update
      set rating = excluded.rating, rd = excluded.rd, n = excluded.n, peak = excluded.peak, last_at = now()
    `
    await testSql`refresh materialized view public.leaderboard`

    await loginUser(page, provEmail)
    await page.goto('/leaderboard/logic')

    // User should see the provisional status banner/card
    const statusCard = page.locator('[data-testid="your-rank-card"]')
    await expect(statusCard).toBeVisible()
    await expect(statusCard).toContainText('provisional, 15 more rated problems needed')
  })

  test('public profile shows stats, calibration, and NEVER leaks answers or playbook text', async ({ page }) => {
    await page.goto(`/u/${userTopHandle}`)

    // Header & stats
    await expect(page.locator('[data-testid="profile-header"]')).toBeVisible()
    await expect(page.getByText(`@${userTopHandle}`)).toBeVisible()
    await expect(page.getByText('1800', { exact: true }).first()).toBeVisible()

    // Verify NO answers or playbook text anywhere on the page
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('SECRET_PLAYBOOK_NOTE_DO_NOT_LEAK_12345')
    expect(bodyText).not.toContain('SECRET_ANSWER_NEVER_LEAK_99999')
  })

  test('hidden user profile shows "This profile is private or does not exist"', async ({ page }) => {
    await page.goto(`/u/${userHiddenHandle}`)
    await expect(page.locator('[data-testid="profile-not-found"]')).toBeVisible()
    await expect(page.getByText('This profile is private or does not exist')).toBeVisible()
  })

  test('report submission works from public profile', async ({ page }) => {
    // Sign in as a reporter
    const reporterTimestamp = Date.now().toString(36).slice(-5)
    const reporterEmail = `rep_${reporterTimestamp}@test.com`
    const reporterHandle = `rep_${reporterTimestamp}`
    const reporterId = await createAuthUser(reporterEmail, reporterHandle, true)

    await loginUser(page, reporterEmail)
    await page.goto(`/u/${userTopHandle}`)

    // Click Report button
    await page.getByRole('button', { name: 'Report' }).click()

    // Fill in reason
    const reasonInput = page.locator('[data-testid="report-reason-input"]')
    await expect(reasonInput).toBeVisible()
    await reasonInput.fill('Suspected external automated tool usage on logic track')

    // Submit
    await page.getByRole('button', { name: 'Submit Report' }).click()

    // Confirmation visible
    await expect(page.locator('[data-testid="report-success-msg"]')).toBeVisible()

    // Verify in database
    const reports = await testSql`
      select * from reports
      where reporter_id = ${reporterId} and target_id = ${userTopId}
    `
    expect(reports.length).toBe(1)
    expect(reports[0].reason).toContain('Suspected external automated tool usage')
  })
})
