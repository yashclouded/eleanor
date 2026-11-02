import { test, expect, type Page } from './fixtures.ts'
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

const MAILPIT_URL = process.env.MAILPIT_URL || 'http://127.0.0.1:54324'

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

      const match = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/i)
      if (match) {
        return match[0].replace(/&amp;/g, '&')
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Magic link for email ${email} not found in Mailpit after ${maxAttempts} attempts`)
}

async function createAuthUser(email: string, handle: string) {
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
      true, 'balanced', 5, 'end_of_set', 3, '{judgment,logic}'::text[]
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

test.describe('Task 4.6: Settings, Landing, and Legal pages', () => {
  test.afterAll(async () => {
    await testSql.end()
  })

  test('landing sample can be solved signed out and makes no network calls to /functions', async ({ page }) => {
    const functionCalls: string[] = []
    page.on('request', (req) => {
      const url = new URL(req.url())
      if (url.pathname.startsWith('/functions/v1/')) {
        functionCalls.push(url.href)
      }
    })

    await page.goto('/')

    // One-line promise from doc.md
    await expect(page.getByText('Think first. Commit an answer and how sure you are.')).toBeVisible()

    // Three short explanations: rating, calibration, echoes
    await expect(page.getByRole('heading', { name: /Rating/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Calibration/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Echoes/i })).toBeVisible()

    // Honest-claims paragraph from doc.md §1
    await expect(page.getByText(/Eleanor trains and measures named skills on its own problems/i)).toBeVisible()

    // Playable static sample problem (the factory example)
    await expect(page.getByText(/In a factory assembly line, 1% of manufactured components are defective/i)).toBeVisible()

    // Answer input
    const answerInput = page.getByTestId('answer-input')
    await expect(answerInput).toBeVisible()
    await answerInput.fill('8.3%')

    // Stated confidence input (quick pick 80% or fill numeric input)
    const confidenceInput = page.locator('#confidence-input')
    if (await confidenceInput.isVisible()) {
      await confidenceInput.fill('80')
    } else {
      await page.getByRole('button', { name: '80%' }).click()
    }

    // Commit button
    const commitBtn = page.getByRole('button', { name: /commit/i })
    await commitBtn.click()

    // Result should be visible client-side
    await expect(page.getByText(/correct/i)).toBeVisible()
    await expect(page.getByText(/8\.33/i)).toBeVisible()

    // Assert zero network calls to /functions
    expect(functionCalls).toHaveLength(0)

    // A11y check on landing page
    await checkA11y(page, 'Landing Page')
  })

  test('changing intensity persists across reload', async ({ page }) => {
    const timestamp = Date.now().toString(36).slice(-5)
    const email = `settings_${timestamp}@example.com`
    const handle = `set_${timestamp}`
    const userId = await createAuthUser(email, handle)

    await loginUser(page, email)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Check that 'balanced' is initially selected
    const balancedRadio = page.locator('input[name="intensity"][value="balanced"]')
    await expect(balancedRadio).toBeChecked()

    // Change intensity to 'stretch'
    const stretchCard = page.locator('label').filter({ hasText: /Stretch/i })
    await stretchCard.click()
    const stretchRadio = page.locator('input[name="intensity"][value="stretch"]')
    await expect(stretchRadio).toBeChecked()

    // Save preferences
    const saveBtn = page.getByRole('button', { name: /save preferences/i })
    await saveBtn.click()
    await expect(page.getByText(/saved/i)).toBeVisible()

    // Reload page and check persistence
    await page.reload()
    await expect(page.locator('input[name="intensity"][value="stretch"]')).toBeChecked()

    // Verify in database
    const [row] = await testSql`select intensity from profiles where id = ${userId}`
    expect(row.intensity).toBe('stretch')

    // A11y check on Settings page
    await checkA11y(page, 'Settings Page')
  })

  test('export downloads a JSON file whose schemaVersion is 1', async ({ page }) => {
    const timestamp = Date.now().toString(36).slice(-5)
    const email = `export_${timestamp}@example.com`
    const handle = `exp_${timestamp}`
    await createAuthUser(email, handle)

    await loginUser(page, email)
    await page.goto('/settings')

    // Click Export my data and wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('export-btn').click()
    const download = await downloadPromise

    const stream = await download.createReadStream()
    if (!stream) {
      throw new Error('No download stream returned')
    }

    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const content = Buffer.concat(chunks).toString('utf-8')
    const parsed = JSON.parse(content)

    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.profile).toBeDefined()
    expect(parsed.profile.handle).toBe(handle)
    expect(parsed).toHaveProperty('trackRatings')
    expect(parsed).toHaveProperty('conceptRatings')
    expect(parsed).toHaveProperty('attempts')
    expect(parsed).toHaveProperty('sets')
  })

  test('delete account with the wrong handle is blocked, with the right handle signs out, and signing in again leads to onboarding', async ({ page }) => {
    const timestamp = Date.now().toString(36).slice(-5)
    const email = `delete_${timestamp}@example.com`
    const handle = `del_${timestamp}`
    const userId = await createAuthUser(email, handle)

    await loginUser(page, email)
    await page.goto('/settings')

    const deleteSection = page.getByTestId('delete-account-section')
    await expect(deleteSection).toBeVisible()

    const confirmInput = page.getByTestId('delete-handle-confirm')
    const deleteBtn = page.getByTestId('delete-account-btn')

    // 1. Wrong handle is blocked
    await confirmInput.fill('wrong_handle')
    await deleteBtn.click()
    await expect(page.getByTestId('delete-account-error')).toBeVisible()
    await expect(page.getByTestId('delete-account-error')).toContainText(/match/i)

    // Verify user still exists in database
    const [existing] = await testSql`select count(*) as count from profiles where id = ${userId}`
    expect(Number(existing.count)).toBe(1)

    // 2. Right handle deletes account and signs out
    await confirmInput.fill(handle)
    await deleteBtn.click()

    // Should sign out and redirect to /login or /
    await page.waitForURL(/\/(login|\/)?$/)

    // Verify user profile is deleted from database
    const [deleted] = await testSql`select count(*) as count from profiles where id = ${userId}`
    expect(Number(deleted.count)).toBe(0)

    // 3. Signing in again with the same email leads to onboarding
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.getByRole('button', { name: 'Send magic link' }).click()
    await expect(page.getByTestId('check-email-state')).toBeVisible()

    const magicLink = await getMagicLinkForEmail(email)
    await page.goto(magicLink)

    // Because profile is deleted, RouteGuard redirects to /onboarding
    await page.waitForURL('**/onboarding')
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible()
  })

  test('legal drafts display draft banner and doc.md §10.5 content', async ({ page }) => {
    // Terms page
    await page.goto('/terms')
    await expect(page.getByTestId('legal-draft-banner')).toBeVisible()
    await expect(page.getByTestId('legal-draft-banner')).toContainText('Draft, needs review by the owner before launch')
    await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible()
    await expect(page.getByText('16 and older')).toBeVisible()
    await checkA11y(page, 'Terms Page')

    // Privacy page
    await page.goto('/privacy')
    await expect(page.getByTestId('legal-draft-banner')).toBeVisible()
    await expect(page.getByTestId('legal-draft-banner')).toContainText('Draft, needs review by the owner before launch')
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Private by Default/i })).toBeVisible()
    await checkA11y(page, 'Privacy Page')
  })
})
