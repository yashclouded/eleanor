import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import postgres from 'postgres'
import { adminClient, createTestUser, createUserClient, SUPABASE_URL } from '../api/helpers.ts'

const testSql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { prepare: false, max: 1 })

declare global { interface Window { toneCount: number } }

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 1440]) {
    test(`landing and login reflow accessibly in ${colorScheme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      for (const path of ['/', '/login']) {
        await page.goto(path)
        await expect(page.locator('.brand-mark')).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.locator('main').evaluate((element) => Promise.all(element.getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished)))
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        const serious = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        expect(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((node) => ({ target: node.target, message: node.failureSummary })) }))).toEqual([])
        if (path === '/') {
          expect(await page.locator('.orbit-motion').evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
        }
        await page.screenshot({ path: test.info().outputPath(`${path === '/' ? 'landing' : 'login'}-${colorScheme}-${width}.png`), fullPage: true })
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

test('sample stays local, sounds are opt-in, and win/loss cues differ', async ({ page }) => {
  const functionRequests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/functions/v1/')) functionRequests.push(request.url()) })
  await page.addInitScript(() => {
    window.toneCount = 0
    const oscillator = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function () { window.toneCount++; return oscillator.call(this) }
  })
  await page.goto('/')
  const sound = page.getByRole('button', { name: 'Sound effects', exact: true })
  await expect(sound).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('answer-input').fill('8.3')
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit answer', exact: true }).click()
  await expect(page.getByText('Correct', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.toneCount)).toBe(0)
  await sound.click()
  await expect(sound).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.getByTestId('answer-input').fill('8.3')
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit answer', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.toneCount)).toBe(3)
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.getByTestId('answer-input').fill('90')
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit answer', exact: true }).click()
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.toneCount)).toBe(5)
  expect(functionRequests).toEqual([])
})

test('the authenticated dashboard has track icons, title trophies, and a mobile navigation', async ({ page }) => {
  const fixture = await createTestUser('visual')
  const userId = fixture.user.id
  try {
    await testSql`
      insert into profiles (id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at, leaderboard_visible, tracks)
      values (${userId}, ${`vis_${userId.slice(0, 8)}`}, now(), now(), now(), true, '{judgment,logic,math,code}')
    `
    await testSql`
      insert into track_ratings (user_id, track_id, rating, rd, n, peak, last_at)
      select ${userId}, id, 1460, 80, 25, 1460, now() from tracks
    `
    const { data, error } = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: fixture.user.email! })
    if (error) throw error
    const { data: auth, error: authError } = await createUserClient('').auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
    if (authError) throw authError
    await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
      key: `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`, session: auth.session,
    })
    await page.route('**/functions/v1/api/daily', (route) => route.fulfill({ json: { ok: true, data: { number: 117, attempt: { state: 'presented' } } } }))
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/today')
      await expect(page.getByTestId('track-card-code')).toBeVisible()
      await page.locator('.track-card').last().evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)))
      await expect(page.locator('.track-symbol')).toHaveCount(4)
      await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const violations = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
      expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((node) => ({ target: node.target, message: node.failureSummary })) }))).toEqual([])
      await page.screenshot({ path: test.info().outputPath(`today-${width}.png`), fullPage: true })
    }
    await page.route('**/functions/v1/api/sets/visual-complete/next', (route) => route.fulfill({ json: { ok: true, data: {
      done: true,
      summary: {
        track: 'judgment', ratingBefore: 1390, ratingAfter: 1460, echoesPassed: 2, suggestedConcept: null,
        attempts: [{ concept: { id: 'judgment.base-rates', name: 'Base rates' }, outcome: 'correct', itemRating: 1400, ratingDelta: 70, fingerprintId: null }],
      },
    } } }))
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.goto('/train/visual-complete')
    await expect(page.locator('.completion-trophy')).toBeVisible()
    await expect(page.getByText('Every problem solved', { exact: true })).toBeVisible()
    await expect(page.getByText('2 echoes passed', { exact: true })).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([])
    await page.screenshot({ path: test.info().outputPath('completed-set-dark.png'), fullPage: true })
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  } finally {
    await adminClient.auth.admin.deleteUser(userId)
    await testSql.end()
  }
})
