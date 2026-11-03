import { test, expect } from './fixtures.ts'
import AxeBuilder from '@axe-core/playwright'
import type { Session } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import postgres from 'postgres'
import { adminClient, createTestUser, createUserClient, SUPABASE_URL } from '../api/helpers.ts'

const testSql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { prepare: false, max: 2 })

let session: Session
let previousSession: Session
let userId: string

async function signIn(email: string) {
  const { data, error } = await adminClient.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const result = await createUserClient('').auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
  if (result.error || !result.data.session) throw result.error ?? new Error('No session')
  return result.data.session
}

test.beforeAll(async () => {
  const fixture = await createTestUser('admin_ui')
  userId = fixture.user.id
  const email = fixture.user.email!
  previousSession = await signIn(email)
  await testSql`
    insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible)
    values (${userId}, ${`aui_${userId.slice(0, 8)}`}, now(), now(), now(), true)
  `
  await promisify(execFile)(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/make-admin.ts', email])
  session = await signIn(email)
  expect(session.user.app_metadata.role).toBe('admin')
})

test.afterAll(async () => {
  if (userId) await adminClient.auth.admin.deleteUser(userId)
  await testSql.end()
})

test.beforeEach(async ({ page }) => {
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  await page.addInitScript(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)) }, { key: storageKey, value: session })
})

test('a fresh admin sign-in reaches diagnostics, accessible model data, and keyboard moderation', async ({ page }) => {
  const writes: Record<string, unknown>[] = []
  const health = {
    n: 60, brier: 0.2, logLoss: 0.6, calError: 0.1, overconfidence: 0.1,
    bins: [{ lo: 0.6, hi: 0.8, n: 60, meanP: 0.7, meanY: 0.6 }],
    perTrack: [{ track: 'judgment', n: 60 }],
    learnerDrift: [{ week: '2026-10-19', track: 'judgment', meanRating: 1350, n: 5 }, { week: '2026-10-26', track: 'judgment', meanRating: 1360, n: 6 }],
    anchorDrift: [{ week: '2026-10-26', track: 'judgment', residual: 0.02, n: 30 }],
  }
  await page.route('**/functions/v1/api/admin/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.split('/admin/')[1]
    let data: unknown
    if (req.method() === 'POST') {
      writes.push(req.postDataJSON())
      data = { actionId: crypto.randomUUID() }
    } else if (path === 'model-health') data = health
    else if (path === 'items') data = { items: [{ id: 'test-item@1#1', track: 'judgment', n: 60, residual: 0.3, anchor: false }] }
    else if (path === 'flags') data = { flags: [{ id: crypto.randomUUID(), userId, handle: 'review_user', track: 'judgment', kind: 'rapid_gain', statistics: { gain: 450 } }] }
    else data = { reports: [{ id: crypto.randomUUID(), userId, handle: 'review_user', reporterHandle: 'reporter', reason: 'Please review outcomes' }] }
    await route.fulfill({ json: { ok: true, data } })
  })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Model health' })).toBeVisible()
  for (const label of ['Brier score', 'Log loss', 'Calibration error', 'Overconfidence gap', 'Rated attempts (N)']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Show as table', exact: true }).first().click()
  await expect(page.getByRole('table', { name: 'Reliability diagram data table' })).toContainText('70%')
  const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
  expect(violations).toEqual([])
  await page.getByRole('button', { name: 'Retire test-item@1#1', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Reason')).toBeFocused()
  await page.keyboard.type('Defective wording confirmed by human review')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('Action recorded')
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({ reason: 'Defective wording confirmed by human review', transitionId: expect.any(String) })
})

test('a non-admin session cannot load the admin console or its data', async ({ page }) => {
  const calls: string[] = []
  await page.route('**/functions/v1/api/admin/**', (route) => { calls.push(route.request().url()); return route.abort() })
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  await page.addInitScript(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)) }, { key: storageKey, value: previousSession })
  await page.goto('/admin')
  await expect(page.getByText('Admin access required', { exact: true })).toBeVisible()
  expect(calls).toEqual([])
})
