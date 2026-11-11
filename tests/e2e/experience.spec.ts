import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { chimes: 0 })
    const parameter = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }
    Object.defineProperty(window, 'AudioContext', { value: class {
      state = 'running'
      currentTime = 0
      destination = {}
      resume() { return Promise.resolve() }
      close() { return Promise.resolve() }
      createOscillator() {
        return { frequency: parameter, connect() {}, disconnect() {}, stop() {}, start() {
          const state = window as unknown as { chimes: number }
          state.chimes++
        } }
      }
      createGain() { return { gain: parameter, connect() {}, disconnect() {} } }
    } })
  })
})

async function answerSample(page: import('@playwright/test').Page, answer: string) {
  await page.locator('#landing-sample-answer').fill(answer)
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit answer' }).click()
}

test('cookies require consent, persist chosen effects, and can be withdrawn', async ({ page }) => {
  await page.goto('/')
  expect((await page.context().cookies()).filter((c) => c.name.startsWith('eleanor_'))).toEqual([])
  await page.getByRole('button', { name: 'Essential only', exact: true }).click()
  expect((await page.context().cookies()).filter((c) => c.name.startsWith('eleanor_')).map((c) => c.name)).toEqual(['eleanor_consent'])
  await page.reload()
  await expect(page.getByRole('region', { name: 'Cookie choices' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Cookie settings' })
  await dialog.getByLabel('Sound effects').uncheck()
  await dialog.getByRole('button', { name: 'Allow preferences' }).click()
  const preferences = (await page.context().cookies()).find((c) => c.name === 'eleanor_preferences')
  expect(preferences?.value).toBe('01')
  expect(preferences?.sameSite).toBe('Lax')
  await page.reload()
  await answerSample(page, '8.33')
  await expect(page.getByTestId('answer-celebration')).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { chimes: number }).chimes)).toBe(0)
  await page.getByRole('button', { name: 'Cookie settings', exact: true }).click()
  await dialog.getByRole('button', { name: 'Essential only' }).click()
  expect((await page.context().cookies()).some((c) => c.name === 'eleanor_preferences')).toBe(false)
})

test('only fresh correct answers chime and celebrate, without replay on reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Essential only', exact: true }).click()
  await answerSample(page, '90')
  await expect(page.getByTestId('answer-celebration')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { chimes: number }).chimes)).toBe(0)
  await page.getByRole('button', { name: 'Try again' }).click()
  await answerSample(page, '8.33')
  await expect(page.getByTestId('answer-celebration')).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { chimes: number }).chimes)).toBe(3)
  await expect(page.getByTestId('answer-celebration')).toHaveCount(0)
  await page.reload()
  expect(await page.evaluate(() => (window as unknown as { chimes: number }).chimes)).toBe(0)
  await expect(page.getByTestId('answer-celebration')).toHaveCount(0)
})

test('reduced motion removes confetti, audio errors never block results, and cookies remain keyboard accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  await page.evaluate(() => { Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('Audio unavailable') } } }) })
  await page.getByRole('button', { name: 'Essential only', exact: true }).click()
  await answerSample(page, '8.33')
  await expect(page.getByRole('status').filter({ hasText: 'Correct' })).toBeVisible()
  await expect(page.getByTestId('answer-celebration')).toHaveCount(0)
  const trigger = page.getByRole('button', { name: 'Cookie settings', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Cookie settings' })).toBeVisible()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(audit.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('blocked cookies keep practice usable and disclose visit-only preferences', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'cookie', { get: () => '', set: () => { throw new Error('Storage blocked') } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Essential only', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Cookies are blocked' })).toBeVisible()
  await answerSample(page, '8.33')
  await expect(page.getByRole('status').filter({ hasText: 'Correct' })).toBeVisible()
})

test('a learner can explicitly use the displayed order, then gets feedback only after the server accepts', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'order@example.com', aud: 'authenticated' }
  const profile = { id: user.id, handle: 'quiet_reason', tracks: ['logic'], theme: 'system', reduced_motion: false }
  const attempt = {
    id: '22222222-2222-4222-8222-222222222222', setId: '33333333-3333-4333-8333-333333333333',
    slot: 0, kind: 'selected', rated: true, state: 'presented', track: 'logic', concept: { id: 'logic.ordering', name: 'Ordering' },
    prompt: [{ t: 'p', text: 'Arrange the values from smallest to largest.' }],
    answerSpec: { type: 'sequence', items: [{ id: 'a', label: '2' }, { id: 'b', label: '5' }, { id: 'c', label: '9' }] },
  }
  await page.addInitScript((user) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }))
  }, user)
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: user }))
  await page.route('**/rest/v1/profiles?*', (route) => route.fulfill({ json: [profile] }))
  await page.route('**/functions/v1/api/sets/*/next', (route) => route.fulfill({ json: { ok: true, data: attempt } }))
  await page.route('**/functions/v1/api/attempts/*/commit', async (route) => {
    expect(route.request().postDataJSON().answer).toEqual(['a', 'b', 'c'])
    await route.fulfill({ json: { ok: true, data: { outcome: 'correct', confidence: .8, forecast: .7, itemRating: 1200, ratingDelta: 10, misconception: null, repairTotal: 0, repairStep: 0 } } })
  })
  await page.goto(`/train/${attempt.setId}`)
  await expect(page.getByTestId('presented-state')).toBeVisible()
  await expect(page.getByTestId('answer-celebration')).toHaveCount(0)
  await page.getByRole('button', { name: 'Use this order', exact: true }).click()
  await page.getByRole('button', { name: '80%', exact: true }).click()
  await page.getByRole('button', { name: 'Commit', exact: true }).click()
  await expect(page.getByTestId('result-outcome')).toHaveText('Correct')
  await expect(page.getByTestId('answer-celebration')).toBeVisible()
})
