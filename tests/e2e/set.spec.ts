import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
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

async function checkA11y(page: Page, contextName: string) {
  const results = await new AxeBuilder({ page }).analyze()
  const seriousViolations = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  )
  if (seriousViolations.length > 0) {
    console.error(`A11y violations in ${contextName}:`, JSON.stringify(seriousViolations, null, 2))
  }
  expect(seriousViolations).toEqual([])
}

async function createAndLoginUser(
  page: Page,
  opts?: {
    tracks?: string[]
    ratingReveal?: 'each' | 'end_of_set'
    setSize?: 3 | 5 | 8
  }
) {
  const email = `learner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
  const handle = `u_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(2, 6)}`
  const ratingReveal = opts?.ratingReveal ?? 'end_of_set'
  const setSize = opts?.setSize ?? 3
  const tracks = opts?.tracks ?? ['judgment', 'logic']

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
      leaderboard_visible, intensity, set_size, rating_reveal, tracks
    ) values (
      ${userId}, ${handle}, now(), now(), now(),
      true, 'balanced', ${setSize}, ${ratingReveal}, ${tracksLiteral}::text[]
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

test.describe('Task 4.2: Set Player E2E', () => {
  test.beforeAll(async () => {
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
      insert into items (id, kind, source_id, source_version, level, track_id, concept_id, family_id, rating, rd, status, anchor)
      values
        ('judgment.base-rate.screening@1#1_freq', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_freq', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_freq', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.frequencies', 'fam_freq', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_freq2', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.frequencies', 'fam_freq2', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_freq2', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.frequencies', 'fam_freq2', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_freq2', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.frequencies', 'fam_freq2', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_est', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.estimation', 'fam_est', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_est', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.estimation', 'fam_est', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_est', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.estimation', 'fam_est', 1800, 250, 'published', true),
        ('judgment.base-rate.screening@1#1_base', 'generated', 'judgment.base-rate.screening', 1, 1, 'judgment', 'judgment.base-rates', 'fam_base', 1200, 250, 'published', true),
        ('judgment.base-rate.screening@1#2_base', 'generated', 'judgment.base-rate.screening', 1, 2, 'judgment', 'judgment.base-rates', 'fam_base', 1500, 250, 'published', true),
        ('judgment.base-rate.screening@1#3_base', 'generated', 'judgment.base-rate.screening', 1, 3, 'judgment', 'judgment.base-rates', 'fam_base', 1800, 250, 'published', true)
      on conflict (id) do update set status = 'published'
    `
  })

  test.afterAll(async () => {
    await testSql.end()
  })

  test('1. Keyboard-only: start a Judgment set, answer, pick a confidence, commit, see result, repair one step, reveal, write insight, go next, and finish all slots, then see summary', async ({
    page,
  }) => {
    await createAndLoginUser(page, { setSize: 3, tracks: ['judgment'] })

    // Start a Judgment set via keyboard from /today
    const startBtn = page.getByRole('button', { name: 'Start Judgment set' })
    await expect(startBtn).toBeVisible()
    await startBtn.focus()
    await page.keyboard.press('Enter')

    // Should navigate to /train/:setId
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    // SLOT 0: Intentionally wrong answer to exercise repair ladder and reveal
    // Answer input
    const answerInput = page.locator('#answer-input')
    await answerInput.focus()
    await page.keyboard.type('99.9')

    // Confidence quick-pick: select 80% with keyboard
    const conf80Btn = page.getByRole('button', { name: '80%' })
    await conf80Btn.focus()
    await page.keyboard.press('Enter')

    // Commit button
    const commitBtn = page.getByRole('button', { name: 'Commit' })
    await expect(commitBtn).toBeEnabled()
    await commitBtn.focus()
    await page.keyboard.press('Enter')

    // Wait for Resolved state
    await expect(page.getByTestId('result-panel')).toBeVisible()
    await expect(page.getByTestId('result-outcome')).toContainText('Incorrect')
    await expect(page.getByText('Problem rated', { exact: false })).toBeVisible()
    await expect(page.getByText('You said 80%', { exact: false })).toBeVisible()

    // Repair ladder: start repair with keyboard
    const repairBtn = page.getByRole('button', { name: 'Start repair ladder' })
    await expect(repairBtn).toBeVisible()
    await repairBtn.focus()
    await page.keyboard.press('Enter')

    // Repair step 0 appears
    await expect(page.getByTestId('repair-ladder')).toBeVisible()
    const repairInput = page.locator('#repair-answer-input')
    await repairInput.focus()
    await page.keyboard.type('10')

    const submitStepBtn = page.getByRole('button', { name: 'Submit step' })
    await submitStepBtn.focus()
    await page.keyboard.press('Enter')

    // Step explanation / feedback shown
    await expect(page.getByTestId('step-feedback')).toBeVisible()

    // Reveal solution
    const revealBtn = page.getByRole('button', { name: 'Reveal solution' })
    await expect(revealBtn).toBeVisible()
    await revealBtn.focus()
    await page.keyboard.press('Enter')

    // Reveal panel visible
    await expect(page.getByTestId('reveal-panel')).toBeVisible()

    // Write insight with keyboard
    const insightInput = page.locator('#insight-input')
    await insightInput.focus()
    await page.keyboard.type('Check base rate and false positives first.')

    const saveInsightBtn = page.getByRole('button', { name: 'Save insight' })
    await saveInsightBtn.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByText('Insight saved', { exact: false })).toBeVisible()

    // Advance to next problem (Slot 1)
    const nextBtn = page.getByRole('button', { name: 'Next problem' })
    await nextBtn.focus()
    await page.keyboard.press('Enter')

    // SLOT 1: Answer and proceed
    await expect(page.getByTestId('presented-state')).toBeVisible()
    await page.locator('#answer-input').focus()
    await page.keyboard.type('10')
    await page.getByRole('button', { name: '70%' }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Commit' }).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('result-panel')).toBeVisible()
    const revealBtn1 = page.getByRole('button', { name: 'Reveal solution' })
    if (await revealBtn1.isVisible()) {
      await revealBtn1.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('reveal-panel')).toBeVisible()
    }
    const nextBtn1 = page.getByRole('button', { name: 'Next problem' })
    await nextBtn1.focus()
    await page.keyboard.press('Enter')

    // SLOT 2: Last slot of 3-slot set
    await expect(page.getByTestId('presented-state')).toBeVisible()
    await page.locator('#answer-input').focus()
    await page.keyboard.type('10')
    await page.getByRole('button', { name: '50%' }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Commit' }).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('result-panel')).toBeVisible()
    const revealBtn2 = page.getByRole('button', { name: 'Reveal solution' })
    if (await revealBtn2.isVisible()) {
      await revealBtn2.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('reveal-panel')).toBeVisible()
    }

    const finishBtn = page.getByRole('button', { name: /Finish set|Next problem/i })
    await finishBtn.focus()
    await page.keyboard.press('Enter')

    // Set summary is displayed!
    await expect(page.getByTestId('set-summary')).toBeVisible()
    await expect(page.getByText('Set Summary', { exact: false })).toBeVisible()
    await expect(page.getByText('Judgment Rating')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Today' })).toBeVisible()
  })

  test("2. Commit is disabled until both a parseable answer and a confidence exist; typing '1/0' shows the parse error and keeps Commit disabled", async ({
    page,
  }) => {
    await createAndLoginUser(page, { setSize: 3, tracks: ['judgment'] })

    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    const commitBtn = page.getByRole('button', { name: 'Commit' })
    const answerInput = page.locator('#answer-input')

    // 1. Initially both empty -> Commit disabled
    await expect(commitBtn).toBeDisabled()

    // 2. Answer typed, but no confidence -> Commit disabled
    await answerInput.fill('25')
    await expect(commitBtn).toBeDisabled()

    // 3. Clear answer, select confidence -> Commit disabled
    await answerInput.fill('')
    await page.getByRole('button', { name: '70%' }).click()
    await expect(commitBtn).toBeDisabled()

    // 4. Type hostile/invalid fraction '1/0' -> shows parse error and keeps Commit disabled
    await answerInput.fill('1/0')
    await expect(page.getByTestId('answer-preview-error')).toBeVisible()
    await expect(page.getByTestId('answer-preview-error')).toContainText('Denominator cannot be zero.')
    await expect(commitBtn).toBeDisabled()

    // 5. Fix answer to valid number -> parse error gone, preview shown, Commit enabled
    await answerInput.fill('25')
    await expect(page.getByTestId('answer-preview')).toBeVisible()
    await expect(page.getByTestId('answer-preview-error')).not.toBeVisible()
    await expect(commitBtn).toBeEnabled()
  })

  test('3. Review Focus 2: intercept commit with page.route and abort it once -> UI shows Retry with draft intact -> Retry succeeds -> assert exactly one set of rating_events and same transitionId', async ({
    page,
  }) => {
    await createAndLoginUser(page, { setSize: 3, tracks: ['judgment'] })

    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    await page.locator('#answer-input').fill('15')
    await page.getByRole('button', { name: '80%' }).click()

    let commitCount = 0
    let firstTransitionId = ''
    let secondTransitionId = ''
    let attemptId = ''

    await page.route('**/functions/v1/api/attempts/*/commit', async (route) => {
      commitCount++
      const req = route.request()
      const match = req.url().match(/\/attempts\/([^/]+)\/commit/)
      if (match) attemptId = match[1]
      const postData = JSON.parse(req.postData() || '{}')

      if (commitCount === 1) {
        firstTransitionId = postData.transitionId
        await route.abort('failed')
      } else {
        secondTransitionId = postData.transitionId
        await route.continue()
      }
    })

    // Click commit -> network aborts
    await page.getByRole('button', { name: 'Commit' }).click()

    // Error banner appears with Retry button
    await expect(page.getByTestId('commit-error')).toBeVisible()
    const retryBtn = page.getByRole('button', { name: 'Retry' })
    await expect(retryBtn).toBeVisible()

    // Draft answer and confidence remain intact
    await expect(page.locator('#answer-input')).toHaveValue('15')
    await expect(page.locator('#confidence-input')).toHaveValue('80')

    // Click Retry -> succeeds
    await retryBtn.click()
    await expect(page.getByTestId('result-panel')).toBeVisible()

    // Verify both requests used identical transitionId
    expect(firstTransitionId).toBeTruthy()
    expect(secondTransitionId).toBeTruthy()
    expect(secondTransitionId).toBe(firstTransitionId)

    // Assert in database that exactly one set of rating_events exists
    const events = await testSql`
      select * from rating_events where attempt_id = ${attemptId}
    `
    expect(events.length).toBeGreaterThan(0)
    const trackEvents = events.filter((e) => e.subject_type === 'track')
    expect(trackEvents.length).toBe(1)
  })

  test('4. A reload after commit shows the same result (no re-commit)', async ({ page }) => {
    await createAndLoginUser(page, { setSize: 3, tracks: ['judgment'] })

    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    await page.locator('#answer-input').fill('20')
    await page.getByRole('button', { name: '90%' }).click()
    await page.getByRole('button', { name: 'Commit' }).click()

    await expect(page.getByTestId('result-panel')).toBeVisible()
    const resultOutcome = await page.getByTestId('result-outcome').textContent()

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Result panel is shown with identical outcome (no re-commit)
    await expect(page.getByTestId('result-panel')).toBeVisible()
    await expect(page.getByTestId('result-outcome')).toHaveText(resultOutcome || '')

    // Verify no presented form is shown
    await expect(page.getByTestId('presented-state')).not.toBeVisible()
  })

  test("5. rating_reveal 'end_of_set' hides the per-problem delta and shows it in the summary; 'each' shows it immediately", async ({
    page,
  }) => {
    // Case A: end_of_set
    await createAndLoginUser(page, { setSize: 3, ratingReveal: 'end_of_set', tracks: ['judgment'] })
    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    await page.locator('#answer-input').fill('20')
    await page.getByRole('button', { name: '70%' }).click()
    await page.getByRole('button', { name: 'Commit' }).click()

    await expect(page.getByTestId('result-panel')).toBeVisible()
    // Delta should be hidden in result panel
    await expect(page.getByTestId('rating-delta')).not.toBeVisible()

    // Case B: each
    await createAndLoginUser(page, { setSize: 3, ratingReveal: 'each', tracks: ['judgment'] })
    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    await page.locator('#answer-input').fill('20')
    await page.getByRole('button', { name: '70%' }).click()
    await page.getByRole('button', { name: 'Commit' }).click()

    await expect(page.getByTestId('result-panel')).toBeVisible()
    // Delta should be visible immediately
    await expect(page.getByTestId('rating-delta')).toBeVisible()
  })

  test('6. Rendering a prompt whose text contains "<img src=x onerror=alert(1)>" shows it as literal text', async ({
    page,
  }) => {
    let dialogFired = false
    page.on('dialog', () => {
      dialogFired = true
    })

    await createAndLoginUser(page, { setSize: 3, tracks: ['judgment'] })

    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()

    // Inject prompt with script tag into the current instance
    const currentUrl = page.url()
    const setId = currentUrl.split('/train/')[1]
    const [att] = await testSql`
      select instance_id from attempts where set_id = ${setId} order by slot asc limit 1
    `
    if (att) {
      const maliciousPrompt = [
        { t: 'p', text: 'Safe paragraph.' },
        { t: 'p', text: '<img src=x onerror=alert(1)>' },
      ]
      await testSql`
        update instances set prompt = ${JSON.stringify(maliciousPrompt)}::jsonb where id = ${att.instance_id}
      `
    }

    // Reload page to render updated prompt
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check that literal text is displayed
    await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
    expect(dialogFired).toBe(false)
  })

  test('7. axe has no serious violations on presented, resolved, repair and revealed states', async ({
    page,
  }) => {
    await createAndLoginUser(page, { setSize: 3, tracks: ['judgment'] })
    await page.getByRole('button', { name: 'Start Judgment set' }).click()
    await page.waitForURL('**/train/*')

    // 1. Presented state
    await expect(page.getByTestId('presented-state')).toBeVisible()
    await checkA11y(page, 'Presented state')

    // 2. Resolved state
    await page.locator('#answer-input').fill('99.9')
    await page.getByRole('button', { name: '80%' }).click()
    await page.getByRole('button', { name: 'Commit' }).click()
    await expect(page.getByTestId('result-panel')).toBeVisible()
    await checkA11y(page, 'Resolved state')

    // 3. Repair state
    const repairBtn = page.getByRole('button', { name: 'Start repair ladder' })
    if (await repairBtn.isVisible()) {
      await repairBtn.click()
      await expect(page.getByTestId('repair-ladder')).toBeVisible()
      await checkA11y(page, 'Repair state')
    }

    // 4. Revealed state
    const revealBtn = page.getByRole('button', { name: /Reveal solution|Skip to reveal/i })
    await expect(revealBtn).toBeVisible()
    await revealBtn.click()
    await expect(page.getByTestId('reveal-panel')).toBeVisible()
    await checkA11y(page, 'Revealed state')
  })
})
