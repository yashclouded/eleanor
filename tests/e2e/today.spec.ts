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

async function createAndLoginUser(
  page: Page,
  opts?: {
    tracks?: string[]
    weeklyGoal?: number
  }
) {
  const email = `today_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
  const handle = `u_today_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(2, 6)}`
  const tracks = opts?.tracks ?? ['judgment', 'logic']
  const weeklyGoal = opts?.weeklyGoal ?? 3

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
  const tracksLiteral = `{${tracks.join(',')}}`
  await testSql`
    insert into profiles (
      id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at,
      leaderboard_visible, intensity, set_size, rating_reveal, weekly_goal, tracks
    ) values (
      ${userId}, ${handle}, now(), now(), now(),
      true, 'balanced', 3, 'end_of_set', ${weeklyGoal}, ${tracksLiteral}::text[]
    )
  `

  for (const track of tracks) {
    await testSql`
      insert into track_ratings (
        user_id, track_id, rating, rd, n, peak
      ) values (
        ${userId}, ${track}, 1200, 350, 0, 1200
      )
      on conflict do nothing
    `
  }

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

  // 4. Retrieve magic link from Mailpit and navigate to it
  const magicLink = await getMagicLinkForEmail(email)
  await page.goto(magicLink)
  await page.waitForURL('**/today')
  await expect(page.getByTestId('today-container')).toBeVisible()

  return { userId, handle, email }
}

test.describe('Task 4.3: Today and Daily Crux Pages E2E', () => {
  test.beforeAll(async () => {
    // Ensure families and items exist for tests
    await testSql`
      insert into families (id, concept_id)
      values
        ('fam_freq', 'judgment.frequencies'),
        ('fam_freq2', 'judgment.frequencies'),
        ('fam_est', 'judgment.estimation'),
        ('fam_est2', 'judgment.estimation'),
        ('fam_cond', 'judgment.conditional'),
        ('fam_exp', 'judgment.expected-value'),
        ('fam_base', 'judgment.base-rates')
      on conflict (id) do nothing
    `

    await testSql`
      insert into items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status, anchor, daily_eligible)
      values
        ('judgment.base-rate.screening@1#1_freq', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq', 1200, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#2_freq', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq', 1400, 250, 'published', true, true),
        ('judgment.base-rate.screening@1#3_freq', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.frequencies', 'fam_freq', 1800, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#1_freq2', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq2', 1200, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#2_freq2', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq2', 1500, 250, 'published', true, true),
        ('judgment.base-rate.screening@1#3_freq2', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.frequencies', 'fam_freq2', 1800, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#1_est', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.estimation', 'fam_est', 1200, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#2_est', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.estimation', 'fam_est', 1400, 250, 'published', true, true),
        ('judgment.base-rate.screening@1#3_est', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.estimation', 'fam_est', 1800, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#1_base', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.base-rates', 'fam_base', 1200, 250, 'published', true, false),
        ('judgment.base-rate.screening@1#2_base', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.base-rates', 'fam_base', 1400, 250, 'published', true, true),
        ('judgment.base-rate.screening@1#3_base', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.base-rates', 'fam_base', 1800, 250, 'published', true, false)
      on conflict (id) do update set status = 'published', daily_eligible = true
    `
  })

  test.afterAll(async () => {
    await testSql.end()
  })

  test('1. Today shows Placement 0/8 for a new user, Daily card links to /daily, weekly dots count 0 distinct days, and no streak count', async ({
    page,
  }) => {
    await createAndLoginUser(page, { tracks: ['judgment', 'logic'], weeklyGoal: 3 })

    // Verify on /today
    await expect(page).toHaveURL(/\/today/)
    await expect(page.getByTestId('today-container')).toBeVisible()

    // 1. Placement 0/8 is shown for tracks with n = 0
    const placementElements = page.getByText('Placement 0/8')
    await expect(placementElements.first()).toBeVisible()

    // 2. Track ratings displayed with provisional ? (e.g. 1200?) and title badge
    await expect(page.getByText('1200?').first()).toBeVisible()
    await expect(page.getByTestId('title-badge').first()).toBeVisible()

    // 3. Due echo count shown
    await expect(page.getByTestId('due-echoes-card')).toBeVisible()

    // 4. Weekly dots: new user has 0 distinct active days this week
    const filledDots = page.locator('[data-testid="weekly-dot-filled"]')
    await expect(filledDots).toHaveCount(0)

    // 5. No streak counter anywhere on the page
    const pageText = await page.innerText('body')
    expect(pageText.toLowerCase()).not.toContain('streak')

    // 6. Daily Crux card links to /daily
    const dailyCard = page.getByTestId('daily-crux-card')
    await expect(dailyCard).toBeVisible()
    await expect(dailyCard.getByTestId('daily-status')).toContainText(/unsolved|not solved/i)

    const dailyLink = dailyCard.getByTestId('daily-card-link')
    await expect(dailyLink).toBeVisible()
    await dailyLink.click()

    await page.waitForURL('**/daily')
    await expect(page).toHaveURL(/\/daily/)
  })

  test('2. After one rated attempt, Today shows Placement 1/8 and weekly dots count 1 distinct day', async ({
    page,
  }) => {
    await createAndLoginUser(page, { tracks: ['judgment'], weeklyGoal: 3 })

    // Start a set from Today
    const startBtn = page.getByRole('button', { name: /start.*judgment/i })
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    // Navigates to SetPlayer
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    // Answer and commit 1 problem
    const answerInput = page.locator('#answer-input')
    await answerInput.fill('8.3')

    const confBtn = page.getByRole('button', { name: '80%' })
    await confBtn.click()

    const commitBtn = page.getByRole('button', { name: 'Commit' })
    await expect(commitBtn).toBeEnabled()
    await commitBtn.click()

    // Resolved state
    await expect(page.getByTestId('result-panel')).toBeVisible()

    // Return to /today
    await page.goto('/today')
    await expect(page.getByTestId('today-container')).toBeVisible()

    // Now Placement 1/8 appears
    await expect(page.getByText('Placement 1/8')).toBeVisible()

    // Open set can be resumed
    await expect(page.getByRole('button', { name: /resume.*judgment/i })).toBeVisible()

    // Weekly dots now count 1 distinct local day
    const filledDots = page.locator('[data-testid="weekly-dot-filled"]')
    await expect(filledDots).toHaveCount(1)

    // Verify no streak count
    const pageText = await page.innerText('body')
    expect(pageText.toLowerCase()).not.toContain('streak')
  })

  test('3. Daily Crux: problem presentation, commit, crowd stats appear, share text has no answer value, and card on Today shows solved', async ({
    page,
  }) => {
    await createAndLoginUser(page, { tracks: ['judgment', 'logic'] })

    // Navigate to /daily
    await page.goto('/daily')
    await page.waitForURL('**/daily')

    // Problem is presented
    await expect(page.getByTestId('prompt-blocks')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Commit' })).toBeDisabled()

    // Fill answer according to input type
    const textInput = page.locator('#answer-input')
    const checkbox = page.locator('input[type="checkbox"]').first()
    const radio = page.locator('input[type="radio"]').first()

    if (await textInput.isVisible().catch(() => false)) {
      await textInput.fill('8.3')
    } else if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click()
    } else if (await radio.isVisible().catch(() => false)) {
      await radio.click()
    }

    await page.getByRole('button', { name: '80%' }).click()
    const commitBtn = page.getByRole('button', { name: 'Commit' })
    await expect(commitBtn).toBeEnabled()
    await commitBtn.click()

    // After commit, crowd stats appear
    await expect(page.getByTestId('crowd-stats')).toBeVisible()
    await expect(page.getByTestId('crowd-solvers')).toBeVisible()
    await expect(page.getByTestId('crowd-pct-correct')).toBeVisible()

    // Check share button
    const shareBtn = page.getByTestId('share-btn')
    await expect(shareBtn).toBeVisible()

    // Intercept clipboard / share
    let capturedShareText = ''
    await page.exposeFunction('mockWriteText', (text: string) => {
      capturedShareText = text
    })
    await page.evaluate(() => {
      // Stub navigator.clipboard.writeText and navigator.share
      Object.defineProperty(navigator, 'share', {
        value: async (data: { text?: string }) => {
          if (data?.text) {
            // @ts-expect-error test mock
            window.mockWriteText(data.text)
          }
        },
        configurable: true,
      })
      Object.defineProperty(navigator.clipboard, 'writeText', {
        value: async (text: string) => {
          // @ts-expect-error test mock
          window.mockWriteText(text)
        },
        configurable: true,
      })
    })

    await shareBtn.click()
    expect(capturedShareText).toBeTruthy()
    expect(capturedShareText).toMatch(/Eleanor Daily #-?\d+ (✅|❌) · \d+% sure · solved by \d+% · .+\/daily/)

    // The share text MUST NOT contain the answer value '8.3'
    expect(capturedShareText).not.toContain('8.3')

    // Return to /today and assert Daily card shows solved
    await page.goto('/today')
    await expect(page.getByTestId('today-container')).toBeVisible()
    const dailyCard = page.getByTestId('daily-crux-card')
    await expect(dailyCard.getByTestId('daily-status')).toContainText(/solved|completed/i)
  })

  test('4. Weekly dots count distinct local days across multiple attempts, with no streak count', async ({
    page,
  }) => {
    const { userId } = await createAndLoginUser(page, { tracks: ['judgment'], weeklyGoal: 3 })

    const inst1 = crypto.randomUUID()
    const inst2 = crypto.randomUUID()
    const inst3 = crypto.randomUUID()

    await testSql`
      insert into instances (id, item_id, seed, skin, prompt, answer_spec)
      values
        (${inst1}, 'judgment.base-rate.screening@1#2_freq', 101, 'default', '[]'::jsonb, '{"kind":"number"}'::jsonb),
        (${inst2}, 'judgment.base-rate.screening@1#2_freq', 102, 'default', '[]'::jsonb, '{"kind":"number"}'::jsonb),
        (${inst3}, 'judgment.base-rate.screening@1#2_freq', 103, 'default', '[]'::jsonb, '{"kind":"number"}'::jsonb)
      on conflict do nothing
    `

    // Simulate 2 resolved attempts on the same day (today)
    await testSql`
      insert into attempts (
        id, user_id, track_id, concept_id, family_id, instance_id, item_id,
        kind, state, outcome, rated, confidence, presented_at, resolved_at
      ) values
        (gen_random_uuid(), ${userId}, 'judgment', 'judgment.frequencies', 'fam_freq',
         ${inst1}, 'judgment.base-rate.screening@1#2_freq',
         'selected', 'resolved', 'correct', true, 0.8, now(), now()),
        (gen_random_uuid(), ${userId}, 'judgment', 'judgment.frequencies', 'fam_freq',
         ${inst2}, 'judgment.base-rate.screening@1#2_freq',
         'selected', 'resolved', 'incorrect', true, 0.5, now(), now())
    `

    await page.goto('/today')
    await expect(page.getByTestId('today-container')).toBeVisible()

    // 2 attempts today = 1 distinct local day
    await expect(page.locator('[data-testid="weekly-dot-filled"]')).toHaveCount(1)

    // Now insert an attempt from 1 local day ago (yesterday) if within the current week
    const now = new Date()
    const currentDayOfWeek = (now.getDay() + 6) % 7
    if (currentDayOfWeek >= 1) {
      // Yesterday is within the same local week
      await testSql`
        insert into attempts (
          id, user_id, track_id, concept_id, family_id, instance_id, item_id,
          kind, state, outcome, rated, confidence, presented_at, resolved_at
        ) values
          (gen_random_uuid(), ${userId}, 'judgment', 'judgment.frequencies', 'fam_freq',
           ${inst3}, 'judgment.base-rate.screening@1#2_freq',
           'selected', 'resolved', 'correct', true, 0.9, now() - interval '1 day', now() - interval '1 day')
      `
      await page.goto('/today')
      await expect(page.locator('[data-testid="weekly-dot-filled"]')).toHaveCount(2)
    }

    // Still no streak counter
    const bodyText = await page.innerText('body')
    expect(bodyText.toLowerCase()).not.toContain('streak')
  })
})
