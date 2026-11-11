import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import postgres from 'postgres'
import { adminClient, createTestUser, createUserClient, SUPABASE_URL } from '../api/helpers.ts'

const testSql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { prepare: false, max: 1 })


for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 1440]) {
    test(`landing and login reflow accessibly in ${colorScheme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      for (const path of ['/', '/login']) {
        await page.goto(path)
        await expect(page.getByRole('link', { name: 'Eleanor Home' }).locator('.brand-mark')).toBeVisible()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await page.locator('main').evaluate((element) => Promise.all(element.getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished)))
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        const serious = (await new AxeBuilder({ page }).analyze()).violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
        expect(serious.map((v) => ({ id: v.id, nodes: v.nodes.map((node) => ({ target: node.target, message: node.failureSummary })) }))).toEqual([])
        await page.screenshot({ path: test.info().outputPath(`${path === '/' ? 'landing' : 'login'}-${colorScheme}-${width}.png`), fullPage: true })
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

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
      await expect(page.locator('.track-art-panel')).toHaveCount(4)
      await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
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
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  } finally {
    await adminClient.auth.admin.deleteUser(userId)
    await testSql.end()
  }
})
