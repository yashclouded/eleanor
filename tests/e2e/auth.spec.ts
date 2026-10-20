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

      // Look for the auth verify url
      const match = body.match(/http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^\s"'<>]+/i)
      if (match) {
        return match[0].replace(/&amp;/g, '&')
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Magic link for email ${email} not found in Mailpit after ${maxAttempts} attempts`)
}

test.describe('Task 4.1: Shell, Auth and Onboarding E2E', () => {
  test.beforeAll(async () => {
    // Clear Mailpit messages before testing
    await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' }).catch(() => {})
  })

  test.afterAll(async () => {
    await testSql.end()
  })

  test('sign in via magic link, complete onboarding with keyboard only, and audit accessibility', async ({ page }) => {
    const email = `learner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
    const handle = `user_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(2, 6)}`

    // 1. Visit /login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Audit Login page with axe
    await checkA11y(page, 'Login page')

    // 2. Keyboard-only login
    await page.locator('#email').focus()
    await page.keyboard.type(email)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // 3. Confirm "check your email" state
    await expect(page.getByTestId('check-email-state')).toBeVisible()

    // 4. Retrieve magic link from Mailpit and navigate to it
    const magicLink = await getMagicLinkForEmail(email)
    expect(magicLink).toContain('/auth/v1/verify')

    await page.goto(magicLink)

    // 5. User should be redirected to /onboarding (session without profile)
    await page.waitForURL('**/onboarding')
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible()

    // --- STEP 1: Legal, Age & Honour ---
    await checkA11y(page, 'Onboarding Step 1')

    // Complete Step 1 with keyboard only
    await page.locator('#age-confirmed').focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // --- STEP 2: Handle ---
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible()
    await checkA11y(page, 'Onboarding Step 2')

    // Test live validation with invalid handle
    await page.locator('#handle').focus()
    await page.keyboard.type('A!') // Uppercase & symbol -> invalid
    await expect(page.getByTestId('handle-format-error')).toBeVisible()

    // Clear and enter valid handle
    await page.keyboard.press('Meta+A')
    await page.keyboard.press('Backspace')
    await page.keyboard.type(handle)
    await expect(page.getByTestId('handle-format-error')).not.toBeVisible()

    // Focus Continue button and press Enter
    await page.getByRole('button', { name: 'Continue' }).focus()
    await page.keyboard.press('Enter')

    // --- STEP 3: Leaderboard Visibility ---
    await expect(page.getByTestId('onboarding-step-3')).toBeVisible()
    await checkA11y(page, 'Onboarding Step 3')

    // Verify leaderboard choice is required: Continue button is blocked until chosen
    const nextBtnStep3 = page.getByTestId('step3-next')
    await expect(nextBtnStep3).toBeDisabled()

    // Verify reload mid-onboarding keeps user on onboarding and preserves state
    await page.reload()
    await expect(page.getByTestId('onboarding-step-3')).toBeVisible()
    await expect(page.getByTestId('step3-next')).toBeDisabled()

    // Keyboard selection of leaderboard option
    await page.locator('#lb-public').focus()
    await page.keyboard.press('Space')
    await expect(nextBtnStep3).toBeEnabled()

    // Advance to Step 4 with keyboard
    await nextBtnStep3.focus()
    await page.keyboard.press('Enter')

    // --- STEP 4: Tracks and Intensity ---
    await expect(page.getByTestId('onboarding-step-4')).toBeVisible()
    await checkA11y(page, 'Onboarding Step 4')

    // Advance with default tracks & balanced intensity
    const nextBtnStep4 = page.getByRole('button', { name: 'Continue' })
    await nextBtnStep4.focus()
    await page.keyboard.press('Enter')

    // --- STEP 5: Confidence Tutorial ---
    await expect(page.getByTestId('onboarding-step-5')).toBeVisible()
    await checkA11y(page, 'Onboarding Step 5')

    // Example 1: Arithmetic Certainty
    await page.locator('#tut1-answer').focus()
    await page.keyboard.type('60')
    await page.getByRole('button', { name: '90%' }).first().focus()
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: 'Check Example 1' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').first()).toContainText('Correct!')

    // Example 2: Event Probability
    await page.locator('#tut2-answer').focus()
    await page.keyboard.type('no')
    await page.getByRole('button', { name: '99%' }).last().focus()
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: 'Check Example 2' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').last()).toContainText('Exactly!')

    // Advance to Step 6
    await page.getByRole('button', { name: 'Continue' }).focus()
    await page.keyboard.press('Enter')

    // --- STEP 6: Review and Submit ---
    await expect(page.getByTestId('onboarding-step-6')).toBeVisible()
    await checkA11y(page, 'Onboarding Step 6')

    // Submit with keyboard
    await page.getByTestId('submit-onboarding').focus()
    await page.keyboard.press('Enter')

    // 6. Should navigate to /today
    await page.waitForURL('**/today')
    await expect(page.getByTestId('today-container')).toBeVisible()
    await expect(page.getByText(`@${handle}`)).toBeVisible()
  })

  test('taken handle displays error from API during onboarding', async ({ page }) => {
    // 1. Create an existing user with handle takenHandle
    const takenHandle = `taken_${Date.now().toString(36).slice(-4)}`
    const seedUser = await adminClient.auth.admin.createUser({
      email: `${takenHandle}@example.com`,
      email_confirm: true,
    })
    if (seedUser.data.user) {
      await testSql`
        insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible, intensity, tracks)
        values (${seedUser.data.user.id}, ${takenHandle}, now(), now(), now(), true, 'balanced', '{"judgment"}'::text[])
      `
    }

    // 2. Start a new user login
    const newEmail = `user2_${Date.now()}@example.com`
    await page.goto('/login')
    await page.locator('#email').fill(newEmail)
    await page.getByRole('button', { name: 'Send magic link' }).click()
    await expect(page.getByTestId('check-email-state')).toBeVisible()

    const magicLink = await getMagicLinkForEmail(newEmail)
    await page.goto(magicLink)
    await page.waitForURL('**/onboarding')

    // Step 1: Legal
    await page.locator('#age-confirmed').check()
    await page.locator('#terms-accepted').check()
    await page.locator('#pledge-accepted').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 2: Handle - enter the taken handle
    await page.locator('#handle').fill(takenHandle)
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 3: Leaderboard
    await page.locator('#lb-public').check()
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 4: Tracks
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 5: Confidence Tutorial
    await page.getByRole('button', { name: 'Continue' }).click()

    // Step 6: Submit
    await page.getByTestId('submit-onboarding').click()

    // Expect taken error from API
    await expect(page.getByTestId('onboarding-error')).toBeVisible()
    await expect(page.getByTestId('onboarding-error')).toContainText('already taken')
  })
})
