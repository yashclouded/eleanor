import { test, expect, type Page } from './fixtures.ts'
import AxeBuilder from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import http from 'node:http'

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
  const email = `coder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`
  const handle = `c_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(2, 6)}`
  const ratingReveal = opts?.ratingReveal ?? 'end_of_set'
  const setSize = opts?.setSize ?? 3
  const tracks = opts?.tracks ?? ['code']

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
        ${userId}, ${track}, 1300, 350, 0, 1300
      )
      on conflict (user_id, track_id) do update set rating = 1300
    `
  }

  // Pre-unlock code.prefix by setting code.implementation to practiced
  await testSql`
    insert into concept_ratings (
      user_id, concept_id, rating, rd, n, state
    ) values (
      ${userId}, 'code.implementation', 1000, 200, 5, 'practiced'
    )
    on conflict (user_id, concept_id) do update set state = 'practiced'
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

  // 4. Retrieve magic link from Mailpit and navigate to it
  const magicLink = await getMagicLinkForEmail(email)
  await page.goto(magicLink)
  await page.waitForURL('**/today')
  await expect(page.getByTestId('today-container')).toBeVisible()

  return { userId, handle, email }
}

interface ScriptedToken {
  status: { id: number; description: string }
  stdout?: string | null
  stderr?: string | null
  compile_output?: string | null
  time?: string | null
  memory?: number | null
}

test.describe('Task 5.3: Code UI E2E', () => {
  let fakeJudgeServer: http.Server
  let fakeJudgeUrl: string
  let tokenSeq = 0

  const tokenMap = new Map<string, ScriptedToken>()
  let nextBatchResponses: ScriptedToken[] = []
  let nextRunResponse: ScriptedToken = {
    status: { id: 3, description: 'Accepted' },
    stdout: '6\n9\n15\n',
    time: '0.010',
    memory: 1024,
  }

  test.beforeAll(async () => {
    fakeJudgeServer = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

      // Batch submit
      if (req.method === 'POST' && url.pathname === '/submissions/batch') {
        let bodyStr = ''
        for await (const chunk of req) bodyStr += chunk
        const parsed = JSON.parse(bodyStr)
        const subs = parsed.submissions ?? []
        const tokens = subs.map((_: unknown, idx: number) => {
          const token = `token_${++tokenSeq}_grp_${idx}`
          const response = nextBatchResponses[idx] ?? {
            status: { id: 3, description: 'Accepted' },
            stdout: '',
          }
          tokenMap.set(token, response)
          return { token }
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(tokens))
        return
      }

      // Batch get
      if (req.method === 'GET' && url.pathname === '/submissions/batch') {
        const tokensParam = url.searchParams.get('tokens') ?? ''
        const tokens = tokensParam.split(',').filter(Boolean)
        const submissions = tokens.map((t) => {
          const data = tokenMap.get(t) ?? {
            status: { id: 3, description: 'Accepted' },
            stdout: '',
          }
          return {
            token: t,
            status: data.status,
            stdout:
              data.stdout !== null && data.stdout !== undefined
                ? Buffer.from(data.stdout).toString('base64')
                : null,
            stderr:
              data.stderr !== null && data.stderr !== undefined
                ? Buffer.from(data.stderr).toString('base64')
                : null,
            compile_output:
              data.compile_output !== null && data.compile_output !== undefined
                ? Buffer.from(data.compile_output).toString('base64')
                : null,
            time: data.time ?? '0.010',
            memory: data.memory ?? 1024,
          }
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ submissions }))
        return
      }

      // Single submit (for /code/run)
      if (req.method === 'POST' && url.pathname === '/submissions') {
        req.resume()
        const token = `run_token_${++tokenSeq}`
        tokenMap.set(token, nextRunResponse)
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ token }))
        return
      }

      // Single get (for /code/run)
      if (req.method === 'GET' && url.pathname.startsWith('/submissions/')) {
        const token = url.pathname.split('/').pop() ?? ''
        const data = tokenMap.get(token) ?? nextRunResponse
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            token,
            status: data.status,
            stdout:
              data.stdout !== null && data.stdout !== undefined
                ? Buffer.from(data.stdout).toString('base64')
                : null,
            stderr:
              data.stderr !== null && data.stderr !== undefined
                ? Buffer.from(data.stderr).toString('base64')
                : null,
            compile_output:
              data.compile_output !== null && data.compile_output !== undefined
                ? Buffer.from(data.compile_output).toString('base64')
                : null,
            time: data.time ?? '0.010',
            memory: data.memory ?? 1024,
          })
        )
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    })

    await new Promise<void>((resolve) => {
      fakeJudgeServer.listen(0, '127.0.0.1', () => {
        const addr = fakeJudgeServer.address()
        if (typeof addr === 'object' && addr !== null) {
          fakeJudgeUrl = `http://127.0.0.1:${addr.port}`
        }
        resolve()
      })
    })

    // Grant permission to copy to clipboard in browser contexts
    // Ensure code track items are published
    await testSql`
      update items set status = 'published' where track_id = 'code'
    `
  })

  test.afterAll(async () => {
    if (fakeJudgeServer) {
      await new Promise<void>((resolve) => fakeJudgeServer.close(() => resolve()))
    }
    await testSql.end()
  })

  test.beforeEach(async ({ context, page }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Direct all edge function Judge0 calls to the fake judge server
    await page.route('**/functions/v1/api/**', (route) => {
      const headers = {
        ...route.request().headers(),
        'x-judge0-url': fakeJudgeUrl,
      }
      route.continue({ headers })
    })
  })

  test('Full Code Track Flow: run samples, compile error stays rated, wrong answer fingerprint & unrated resubmit, reveal tabs, keyboard plain-text toggle, draft reload, axe audit', async ({
    page,
  }) => {
    await createAndLoginUser(page, { tracks: ['code'], setSize: 3 })

    // 1. Start a Code set from Today
    const startBtn = page.getByRole('button', { name: /Start code set/i })
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    await page.waitForURL('**/train/**')
    await expect(page.getByTestId('code-editor-component')).toBeVisible()

    // 2. Problem Statement, Formats, Constraints, Samples
    await expect(page.getByTestId('problem-statement')).toBeVisible()
    await expect(page.getByTestId('problem-input-format')).toBeVisible()
    await expect(page.getByTestId('problem-output-format')).toBeVisible()
    await expect(page.getByTestId('problem-constraints')).toBeVisible()
    await expect(page.getByTestId('problem-samples')).toBeVisible()

    // Test copy button on sample input
    const copyInputBtn = page.getByTestId('copy-sample-0-input')
    await expect(copyInputBtn).toBeVisible()
    await copyInputBtn.click()
    await expect(copyInputBtn).toHaveText('Copied!')

    // 3. Plain-text editor toggle works with keyboard only
    const plainToggle = page.locator('#plain-text-toggle')
    await plainToggle.focus()
    await page.keyboard.press('Space')

    const plainTextarea = page.locator('#plain-text-source')
    await expect(plainTextarea).toBeVisible()

    // Type a starter Python solution in plain text editor
    await plainTextarea.fill('import sys\nprint("6\\n9\\n15\\n")\n')

    // 4. Run samples and see output
    nextRunResponse = {
      status: { id: 3, description: 'Accepted' },
      stdout: '6\n9\n15\n',
      time: '0.012',
      memory: 1240,
    }

    const runBtn = page.getByTestId('run-button')
    await runBtn.click()

    await expect(page.getByTestId('run-output-panel')).toBeVisible()
    await expect(page.getByTestId('run-stdout')).toContainText('6\n9\n15')

    // Accessibility check on presented editor & run output
    await checkA11y(page, 'code editor presented state with run output')

    // 5. Submit with confidence: Compilation Error
    // Script fake judge to return compilation error on all test tokens
    nextBatchResponses = [
      {
        status: { id: 6, description: 'Compilation Error' },
        compile_output: 'error: expected ; before } token\n',
      },
    ]

    // Select confidence 70%
    await page.getByRole('button', { name: '70%' }).click()

    // Click submit
    const submitBtn = page.getByTestId('code-submit-button')
    await submitBtn.click()

    // Verify polite live region shows "Judging…"
    const liveRegion = page.getByTestId('judging-indicator')
    await expect(liveRegion).toBeVisible()
    await expect(liveRegion).toContainText('Judging…')

    // Verify Compilation error verdict appears
    await expect(page.getByTestId('verdict-compile-error')).toBeVisible()
    await expect(page.getByTestId('compile-output')).toContainText('error: expected ; before }')

    // Verify attempt remains in presented state (submit button is still ready and next submit is still rated)
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toHaveText('Submit')

    // 6. Submit with confidence: Wrong answer on group 3 ('overflow')
    // Next submit is STILL rated!
    const testGroups = await testSql<{ group_idx: number; label: string; fingerprint: string; expected: string }[]>`
      select group_idx, label, fingerprint, expected
      from code_tests
      where item_id = 'code.prefix.range-sums@1#1'
      order by group_idx asc
    `

    nextBatchResponses = testGroups.map((g, idx) => {
      if (idx === 3) {
        return {
          status: { id: 4, description: 'Wrong Answer' },
          stdout: 'wrong_overflow_output\n',
        }
      }
      return {
        status: { id: 3, description: 'Accepted' },
        stdout: g.expected,
      }
    })

    // Select confidence 80%
    await page.getByRole('button', { name: '80%' }).click()
    await submitBtn.click()

    // Wait for "Judging…" then verdict
    await expect(liveRegion).toBeVisible()
    await expect(page.getByTestId('verdict-wrong-answer')).toBeVisible()

    // Verify failing test group fingerprint is displayed
    const failedLabel = page.getByTestId('failed-group-label')
    await expect(failedLabel).toHaveText('overflow')
    const failedFingerprint = page.getByTestId('failed-group-fingerprint')
    await expect(failedFingerprint).toContainText('32-bit integer overflow beyond 2^31')

    // Because this was the first non-compile submission, it was rated (no unrated badge yet)
    await expect(page.getByTestId('unrated-badge')).toHaveCount(0)

    // 7. Repair resubmission: labelled "Unrated"
    // Now script fake judge to accept the repair submission
    nextBatchResponses = testGroups.map((g) => ({
      status: { id: 3, description: 'Accepted' },
      stdout: g.expected,
    }))

    await plainTextarea.fill('// fixed overflow with 64-bit integers\n')

    const repairSubmitBtn = page.getByTestId('code-submit-button')
    await expect(repairSubmitBtn).toHaveText('Submit repair')

    // Resubmit in repair mode
    await repairSubmitBtn.click()

    // Wait for resolution
    await expect(page.getByTestId('verdict-accepted')).toBeVisible()
    // Verify the repair resubmission is labelled "Unrated"
    await expect(page.getByTestId('unrated-badge')).toBeVisible()
    await expect(page.getByTestId('unrated-badge')).toHaveText('Unrated')

    // 8. Reload keeps the source draft
    await plainTextarea.fill('// unique draft line 9999\n')
    // Wait briefly for autosave
    await page.waitForTimeout(300)
    await page.reload()

    await page.waitForURL('**/train/**')
    const reloadedTextarea = page.locator('#plain-text-source')
    await expect(reloadedTextarea).toBeVisible()
    await expect(reloadedTextarea).toHaveValue('// unique draft line 9999\n')

    // 9. Reveal solution: shows editorial and reference solutions in tabs
    const revealBtn = page.getByTestId('reveal-button')
    await expect(revealBtn).toBeVisible()
    await revealBtn.click()

    // Editorial section
    await expect(page.getByTestId('editorial-section')).toBeVisible()
    await expect(page.getByTestId('editorial-section')).toContainText('Prefix sums')

    // Reference solutions section with tabs
    await expect(page.getByTestId('reference-solutions-section')).toBeVisible()
    const cppTab = page.getByTestId('tab-cpp')
    const pythonTab = page.getByTestId('tab-python')
    await expect(cppTab).toBeVisible()
    await expect(pythonTab).toBeVisible()

    // Click Python tab
    await pythonTab.click()
    await expect(page.getByTestId('reference-code-python')).toBeVisible()
    await expect(page.getByTestId('reference-code-python')).toContainText('sys')

    // Copy reference solution
    const copyRefBtn = page.getByTestId('copy-reference-solution')
    await copyRefBtn.click()
    await expect(copyRefBtn).toHaveText('Copied!')

    // Final accessibility audit on reveal state
    await checkA11y(page, 'code reveal editorial and reference solution tabs')
  })
})
