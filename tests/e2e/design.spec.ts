import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('dashboard navigation, themes, and small screens work without live services', async ({ page }, testInfo) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'design@example.com', aud: 'authenticated' }
  const profile = { id: user.id, handle: 'curious_mind', tracks: ['judgment', 'logic', 'math', 'code'], weekly_goal: 3, theme: 'system', reduced_motion: false }
  await page.addInitScript((user) => {
    const session = { access_token: 'design-test-token', refresh_token: 'design-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }
    for (const key of ['sb-127-auth-token', 'sb-localhost-auth-token']) localStorage.setItem(key, JSON.stringify(session))
  }, user)
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: user }))
  await page.route('**/rest/v1/**', (route) => {
    const isProfile = new URL(route.request().url()).pathname.endsWith('/profiles')
    return route.fulfill({ json: isProfile ? [profile] : [], headers: { 'content-range': '*/0' } })
  })
  await page.route('**/functions/v1/api/daily', (route) => route.fulfill({ json: { ok: true, data: { number: 42, attempt: { state: 'presented' } } } }))
  await page.goto('/today')
  await expect(page.getByTestId('track-card-code')).toBeVisible()
  await expect(page.getByText('Placement 0/8')).toHaveCount(4)
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [320, 640, 768, 1440]) {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 900 })
      const nav = page.getByRole('navigation', { name: 'Main Navigation' })
      await expect(nav).toBeVisible()
      await expect(page.getByTestId('sign-out-btn')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (width === 320) {
        const box = await nav.boundingBox()
        expect(box!.y).toBeGreaterThan(700)
      }
      const textColor = await page.locator('body').evaluate((body) => getComputedStyle(body).color)
      await expect(page.locator('h1')).toHaveCSS('color', textColor)
      await page.screenshot({ path: testInfo.outputPath(`today-${colorScheme}-${width}.png`), fullPage: true })
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
      expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.failureSummary) }))).toEqual([])
    }
  }
  await page.getByRole('link', { name: 'Your playbook' }).click()
  await expect(page).toHaveURL(/\/playbook/)
})

test('landing invites keyboard practice, requires confidence, and keeps the sample local', async ({ page }) => {
  const learningRequests: string[] = []
  const editorRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/functions/v1/')) learningRequests.push(request.url())
    if (request.url().includes('/CodeEditor.tsx')) editorRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'A little practice. A clearer mind.' })).toBeVisible()
  await page.getByRole('link', { name: 'Try a problem' }).click()
  await expect(page.locator('#landing-sample-answer')).toBeFocused()
  await page.keyboard.type('8.33')
  await expect(page.getByRole('button', { name: 'Commit answer' })).toBeDisabled()
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit answer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Correct' })).toBeVisible()
  await expect(page.getByText('Worked Solution')).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('#landing-sample-answer')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Commit answer' })).toBeDisabled()
  expect(learningRequests).toEqual([])
  expect(editorRequests).toEqual([])
})

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [375, 1440]) {
    test(`public screens fit and remain accessible at ${width}px in ${colorScheme}`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', '/login']) {
        await page.goto(path)
        await expect(page.locator('h1')).toBeVisible()
        const textColor = await page.locator('body').evaluate((body) => getComputedStyle(body).color)
        await expect(page.locator('h1')).toHaveCSS('color', textColor)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(`${path === '/' ? 'landing' : 'login'}.png`), fullPage: true })
        const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
        expect(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, reason: n.failureSummary })) }))).toEqual([])
      }
    })
  }
}
