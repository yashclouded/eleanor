import { expect, test, type Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import postgres from 'postgres'
import { adminClient, createTestUser, createUserClient, SUPABASE_URL } from '../api/helpers.ts'
import { loadSelectionInput } from '../../supabase/functions/api/load.ts'

const testSql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { prepare: false, max: 2 })

let server: Server, origin: string, userId: string
const orphanInstances: string[] = []

test.beforeAll(async () => {
  test.setTimeout(60000)
  await promisify(execFile)(process.execPath, ['node_modules/vite/bin/vite.js', 'build'])
  const headers = Object.fromEntries((await readFile('dist/_headers', 'utf8')).trim().split('\n').slice(1).map((line) => {
    const colon = line.indexOf(':'); return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()]
  }))
  server = createServer(async (req, res) => {
    let file: string
    try {
      file = resolve('dist', '.' + decodeURIComponent(new URL(req.url!, 'http://localhost').pathname))
      if (!file.startsWith(resolve('dist') + '/')) file = resolve('dist/index.html')
      if (!extname(file)) file = resolve('dist/index.html')
      const data = await readFile(file)
      const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
      res.writeHead(200, { ...headers, 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }); res.end(data)
    } catch { res.writeHead(404); res.end() }
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server port')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createTestUser('hardening')
  userId = fixture.user.id
  await testSql`
    insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible, tracks)
    values (${userId}, ${`hard_${userId.slice(0, 8)}`}, now(), now(), now(), false, '{judgment,code}')
  `
  await testSql`insert into track_ratings (user_id, track_id, rating, rd, n, peak) values (${userId}, 'judgment', 1300, 80, 300, 1400)`
  const instances = await testSql`
    insert into instances (item_id, seed, prompt, answer_spec)
    select i.id, s.n, '[]', '{"type":"integer"}' from
      (select id from items where track_id = 'judgment' order by id limit 1) i cross join generate_series(1, 300) s(n)
    returning id, item_id, seed
  `
  orphanInstances.push(...instances.map((row) => row.id))
  await testSql`
    insert into attempts (user_id, instance_id, item_id, track_id, concept_id, family_id, kind, state, outcome, rated, confidence, forecast, resolved_at)
    select ${userId}, ins.id, i.id, i.track_id, i.concept_id, i.family_id, 'selected', 'resolved',
      case when ins.seed % 4 = 0 then 'incorrect' else 'correct' end, true, 0.75, 0.75,
      now() - ins.seed * interval '1 minute'
    from instances ins join items i on i.id = ins.item_id where ins.id in ${testSql(instances.map((row) => row.id))}
  `
  await testSql`
    insert into rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version, created_at)
    select id, user_id, 'track', track_id, 1299, 80, 1300, 80, 0.75, case when outcome = 'correct' then 1 else 0 end, 'erm-1', resolved_at
    from attempts where user_id = ${userId}
  `
})

test.afterAll(async () => {
  if (userId) await adminClient.auth.admin.deleteUser(userId)
  if (orphanInstances.length) await testSql`delete from instances where id in ${testSql(orphanInstances)}`
  await testSql.end()
  if (server) await new Promise<void>((done) => server.close(() => done()))
})

async function login(page: Page) {
  const { data: user } = await adminClient.auth.admin.getUserById(userId)
  const { data: link, error } = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: user.user!.email! })
  if (error) throw error
  const { data: auth, error: authError } = await createUserClient('').auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (authError) throw authError
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`, session: auth.session,
  })
}

test('300-attempt Progress loads under 1.5 seconds with the production CSP', async ({ page }) => {
  await login(page)
  const violations: string[] = []
  await page.exposeFunction('reportCsp', (directive: string) => violations.push(directive))
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (event) => {
    void (window as unknown as { reportCsp(value: string): Promise<void> }).reportCsp(event.violatedDirective)
  }))
  const response = await page.goto(`${origin}/progress`)
  await expect(page.getByTestId('calibration-panel')).toBeVisible()
  await expect(page.getByTestId('cal-n')).toContainText('100')
  const elapsed = await page.evaluate(() => performance.now())
  console.log(`Progress: 300 attempts, cold navigation ${Math.round(elapsed)} ms`)
  expect(elapsed).toBeLessThan(1500)
  expect(response!.headers()['content-security-policy']).toContain("script-src 'self'")
  expect(response!.headers()['referrer-policy']).toBe('no-referrer')
  expect(violations).toEqual([])
})

test('explains every selection-input query for the 300-attempt learner', async () => {
  const queries: { text: string; values: unknown[] }[] = []
  const capture = new Proxy(testSql, {
    apply(target, thisArg, args) {
      const [strings, ...values] = args as [TemplateStringsArray, ...unknown[]]
      queries.push({ text: strings.reduce((text, part, i) => text + (i ? `$${i}` : '') + part, ''), values })
      return Reflect.apply(target, thisArg, args)
    },
  })
  await loadSelectionInput(capture, userId, 'judgment', { id: crypto.randomUUID(), user_id: userId, track_id: 'judgment', mode: 'rated', size: 5, rng_seed: 1, created_at: new Date(), closed_at: null, close_reason: null })
  expect(queries).toHaveLength(9)
  const plans = []
  for (const query of queries) {
    const plan = await testSql.unsafe(`explain (analyze, buffers, format json) ${query.text}`, query.values as never[])
    plans.push(plan[0]['QUERY PLAN'][0])
  }
  console.log('Selection plans:', JSON.stringify(plans.map((p) => ({ node: p.Plan['Node Type'], rows: p.Plan['Actual Rows'], ms: p['Execution Time'], indexes: JSON.stringify(p.Plan).match(/"Index Name":"[^"]+/g) ?? [] }))))
  expect(plans.every((p) => p['Execution Time'] < 100)).toBe(true)
})

test('explicit win sounds and lazy CodeMirror work under shipped headers', async ({ page }) => {
  await page.addInitScript(() => {
    window.toneCount = 0
    const oscillator = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function () { window.toneCount++; return oscillator.call(this) }
  })
  await page.goto(origin)
  await page.getByRole('button', { name: 'Sound effects', exact: true }).click()
  await page.getByTestId('answer-input').fill('8.3')
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit answer', exact: true }).click()
  await expect(page.getByText('Correct', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.toneCount)).toBe(3)
  await login(page)
  await page.route('**/functions/v1/api/sets/*/next', (route) => route.fulfill({ json: { ok: true, data: {
    id: crypto.randomUUID(), setId: null, slot: 0, kind: 'selected', rated: true, state: 'presented', track: 'code',
    concept: { id: 'code.implementation', name: 'Implementation' }, prompt: [], answerSpec: { type: 'code', statement: [{ t: 'p', text: 'Read an integer.' }], samples: [{ input: '1\n', output: '1\n' }] },
  } } }))
  await page.goto(`${origin}/train/${crypto.randomUUID()}`)
  await expect(page.locator('.cm-editor')).toBeVisible()
  await page.locator('.cm-content').fill('print(42)')
  await expect(page.locator('.cm-content')).toContainText('print(42)')
  await page.context().grantPermissions(['clipboard-write'])
  await page.getByTestId('copy-sample-0-input').click()
  await expect(page.getByTestId('copy-sample-0-input')).toHaveText('Copied!')
})

test('failed lazy editor keeps the surrounding attempt and offers reload', async ({ page }) => {
  await login(page)
  await page.route('**/assets/CodeEditor-*.js', (route) => route.abort())
  await page.route('**/functions/v1/api/sets/*/next', (route) => route.fulfill({ json: { ok: true, data: {
    id: crypto.randomUUID(), setId: null, slot: 0, kind: 'selected', rated: true, state: 'presented', track: 'code',
    concept: { id: 'code.implementation', name: 'Implementation' }, prompt: [], answerSpec: { type: 'code' },
  } } }))
  await page.goto(`${origin}/train/${crypto.randomUUID()}`)
  await expect(page.getByRole('alert')).toContainText('Could not load the code editor.')
  await expect(page.getByRole('button', { name: 'Reload to retry' })).toBeVisible()
  await expect(page.getByRole('button', { name: "I'm stuck", exact: true })).toBeVisible()
})
