import { test, expect, type Page } from '@playwright/test'
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

const MAILPIT_URL = 'http://127.0.0.1:54324'

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

      const match = body.match(/http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^\s"'<>]+/i)
      if (match) {
        return match[0].replace(/&amp;/g, '&')
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Magic link for email ${email} not found in Mailpit after ${maxAttempts} attempts`)
}

async function createAndLoginUser(page: Page) {
  const email = `prog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
  const handle = `u_prog_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(2, 6)}`

  // 1. Create auth user
  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    throw new Error(`Failed to create test user: ${userError?.message}`)
  }

  const userId = userData.user.id

  // 2. Insert profile directly
  await testSql`
    insert into profiles (
      id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at,
      leaderboard_visible, intensity, set_size, rating_reveal, tracks
    ) values (
      ${userId}, ${handle}, now(), now(), now(),
      true, 'balanced', 5, 'end_of_set', '{"judgment","logic"}'::text[]
    )
  `

  await testSql`
    insert into track_ratings (user_id, track_id, rating, rd, n, peak)
    values
      (${userId}, 'judgment', 1200, 350, 0, 1200),
      (${userId}, 'logic', 1200, 350, 0, 1200)
    on conflict do nothing
  `

  // 3. Login through /login magic link flow
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

  // 4. Retrieve magic link from Mailpit and navigate
  const magicLink = await getMagicLinkForEmail(email)
  await page.goto(magicLink)
  await page.waitForURL('**/today')

  return { userId, handle, email }
}

test.describe('Task 4.4: Progress and Playbook E2E', () => {
  test.beforeAll(async () => {
    await testSql`
      insert into families (id, concept_id)
      values
        ('fam_freq', 'judgment.frequencies'),
        ('fam_est', 'judgment.estimation')
      on conflict (id) do nothing
    `

    await testSql`
      insert into items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status, anchor)
      values
        ('judgment.base-rate.screening@1#1_freq', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_freq', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq', 1400, 250, 'published', true)
      on conflict (id) do nothing
    `
  })

  test.afterAll(async () => {
    await testSql.end()
  })

  test('1. Below 30 answers, calibration panel shows "appears after 30" message with right N, and Brier is never shown alone', async ({
    page,
  }) => {
    const { userId } = await createAndLoginUser(page)

    // Seed 5 rated resolved attempts
    for (let i = 0; i < 5; i++) {
      const instId = crypto.randomUUID()
      await testSql`
        insert into instances (id, item_id, seed, skin, prompt, answer_spec)
        values (${instId}, 'judgment.base-rate.screening@1#1_freq', ${100 + i}, 'default', '[]'::jsonb, '{"kind":"number"}'::jsonb)
      `
      await testSql`
        insert into attempts (
          id, user_id, track_id, concept_id, family_id, instance_id, item_id,
          kind, state, outcome, rated, confidence, forecast, presented_at, resolved_at
        ) values (
          gen_random_uuid(), ${userId}, 'judgment', 'judgment.frequencies', 'fam_freq',
          ${instId}, 'judgment.base-rate.screening@1#1_freq', 'selected', 'resolved',
          ${i % 2 === 0 ? 'correct' : 'incorrect'}, true, 0.7, 0.65, now(), now()
        )
      `
    }

    await page.goto('/progress')
    await expect(page.getByTestId('progress-container')).toBeVisible()

    // Assert "Calibration appears after 30 rated answers (you have 5)"
    const gateMsg = page.getByTestId('calibration-gate')
    await expect(gateMsg).toBeVisible()
    await expect(gateMsg).toContainText('Calibration appears after 30 rated answers (you have 5)')

    // Brier score is NOT visible below 30
    await expect(page.locator('[data-testid="brier-score"]')).toHaveCount(0)

    // Check that Brier is never shown without cal-error, gap, and N
    const pageText = await page.innerText('body')
    expect(pageText.toLowerCase()).not.toContain('brier score:')
  })

  test('2. With 40 attempts seeded, calibration panel shows Brier, calibration error, gap, and N together', async ({
    page,
  }) => {
    const { userId } = await createAndLoginUser(page)

    // Seed 40 attempts
    for (let i = 0; i < 40; i++) {
      const instId = crypto.randomUUID()
      await testSql`
        insert into instances (id, item_id, seed, skin, prompt, answer_spec)
        values (${instId}, 'judgment.base-rate.screening@1#1_freq', ${200 + i}, 'default', '[]'::jsonb, '{"kind":"number"}'::jsonb)
      `
      const isCorrect = i % 3 !== 0
      const conf = (50 + (i % 5) * 10) / 100 // 0.5 to 0.9
      const forecast = 0.6
      await testSql`
        insert into attempts (
          id, user_id, track_id, concept_id, family_id, instance_id, item_id,
          kind, state, outcome, rated, confidence, forecast, presented_at, resolved_at
        ) values (
          gen_random_uuid(), ${userId}, 'judgment', 'judgment.frequencies', 'fam_freq',
          ${instId}, 'judgment.base-rate.screening@1#1_freq', 'selected', 'resolved',
          ${isCorrect ? 'correct' : 'incorrect'}, true, ${conf}, ${forecast}, now(), now()
        )
      `
    }

    await page.goto('/progress')
    await expect(page.getByTestId('progress-container')).toBeVisible()

    // Calibration panel is visible
    const calPanel = page.getByTestId('calibration-panel')
    await expect(calPanel).toBeVisible()

    // Assert Brier, calibration error, overconfidence gap, and N are all displayed together
    await expect(page.getByTestId('brier-score')).toBeVisible()
    await expect(page.getByTestId('cal-error')).toBeVisible()
    await expect(page.getByTestId('overconfidence-gap')).toBeVisible()
    await expect(page.getByTestId('cal-n')).toContainText('40')

    // ReliabilityChart is visible with role="img" and table toggle
    const chart = page.locator('[data-testid="reliability-diagram"] svg')
    await expect(chart).toBeVisible()
    await expect(chart).toHaveAttribute('role', 'img')

    // Table toggle works
    const toggleTableBtn = page.getByTestId('toggle-reliability-table')
    await expect(toggleTableBtn).toBeVisible()
    await toggleTableBtn.click()
    await expect(page.getByTestId('reliability-table')).toBeVisible()
  })

  test('3. Editing and deleting a playbook note works and survives a reload', async ({
    page,
  }) => {
    const { userId } = await createAndLoginUser(page)

    // Seed an attempt and playbook entry
    const instId = crypto.randomUUID()
    const attemptId = crypto.randomUUID()
    await testSql`
      insert into instances (id, item_id, seed, skin, prompt, answer_spec)
      values (${instId}, 'judgment.base-rate.screening@1#1_freq', 999, 'default', '[]'::jsonb, '{"kind":"number"}'::jsonb)
    `
    await testSql`
      insert into attempts (
        id, user_id, track_id, concept_id, family_id, instance_id, item_id,
        kind, state, outcome, rated, confidence, presented_at, resolved_at, revealed_at
      ) values (
        ${attemptId}, ${userId}, 'judgment', 'judgment.frequencies', 'fam_freq',
        ${instId}, 'judgment.base-rate.screening@1#1_freq', 'selected', 'revealed',
        'correct', true, 0.8, now(), now(), now()
      )
    `
    const noteId = crypto.randomUUID()
    await testSql`
      insert into playbook (id, user_id, attempt_id, concept_id, text)
      values (${noteId}, ${userId}, ${attemptId}, 'judgment.frequencies', 'Always check the base rate first')
    `

    // Navigate to /playbook
    await page.goto('/playbook')
    await expect(page.getByTestId('playbook-container')).toBeVisible()

    // Note is visible
    await expect(page.getByText('Always check the base rate first')).toBeVisible()

    // 1. Edit the note
    await page.getByTestId(`edit-note-${noteId}`).click()
    const textarea = page.locator(`textarea[data-testid="note-input-${noteId}"]`)
    await textarea.fill('Always check the base rate first before multiplying conditional odds')
    await page.getByTestId(`save-note-${noteId}`).click()

    // Verify updated on screen
    await expect(
      page.getByText('Always check the base rate first before multiplying conditional odds')
    ).toBeVisible()

    // Reload and assert updated note persists
    await page.reload()
    await expect(page.getByTestId('playbook-container')).toBeVisible()
    await expect(
      page.getByText('Always check the base rate first before multiplying conditional odds')
    ).toBeVisible()

    // 2. Delete the note
    await page.getByTestId(`delete-note-${noteId}`).click()
    // Confirm delete if modal or direct
    const confirmBtn = page.getByTestId(`confirm-delete-${noteId}`)
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click()
    }

    // Verify note is gone from UI
    await expect(
      page.getByText('Always check the base rate first before multiplying conditional odds')
    ).toHaveCount(0)

    // Reload and assert deletion persists
    await page.reload()
    await expect(page.getByTestId('playbook-container')).toBeVisible()
    await expect(
      page.getByText('Always check the base rate first before multiplying conditional odds')
    ).toHaveCount(0)
  })
})
