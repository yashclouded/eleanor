import { test as base, expect, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { adminClient, call, createTestUser, createUserClient, SUPABASE_URL } from '../api/helpers.ts'

export { expect }
export type { Page }

export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(/\/functions\/v1\/api\/daily(?:\/|\?|$)/, route => route.continue({
      headers: { ...route.request().headers(), 'x-test-clock': '2026-11-01T12:00:00Z' },
    }))
    await provide(page)
  },
})

export async function signIn(page: Page, prefix: string, onboarded = true, admin = false) {
  const fixture = await createTestUser(prefix)
  const userId = fixture.user.id
  const handle = `e2e_${userId.slice(0, 8)}`
  if (admin) {
    const { error } = await adminClient.auth.admin.updateUserById(userId, { app_metadata: { role: 'admin' } })
    if (error) throw error
  }
  const { data: link, error } = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: fixture.user.email! })
  if (error) throw error
  const verified = await createUserClient('').auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (verified.error || !verified.data.session) throw verified.error ?? new Error('Missing test session')
  const session = verified.data.session
  if (onboarded) {
    const response = await call('/onboarding', { handle, ageConfirmed: true, termsAccepted: true,
      pledgeAccepted: true, leaderboardVisible: true, tracks: ['judgment'], intensity: 'balanced' }, session.access_token)
    expect(response.status).toBe(201)
  }
  const key = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  await page.addInitScript(({ key, session }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(session))
  }, { key, session })
  return { userId, handle, token: session.access_token }
}

export async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  await expect(target).toBeEnabled()
  for (let i = 0; i < 100; i++) {
    if (await target.evaluate(element => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`Control is unreachable by Tab: ${await target.getAttribute('id') ?? await target.textContent()}`)
}

export async function activate(page: Page, target: Locator, key = 'Enter') {
  await tabTo(page, target)
  await page.keyboard.press(key)
}

export async function typeInto(page: Page, target: Locator, value: string) {
  await tabTo(page, target)
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(value)
}

export async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, failure: n.failureSummary })) }))).toEqual([])
}

export async function noPageOverflow(page: Page) {
  const layout = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    return { overflow: document.documentElement.scrollWidth - width,
      elements: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > width + 1)
        .slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.slice(0, 80) })) }
  })
  expect(layout.overflow, JSON.stringify(layout.elements)).toBeLessThanOrEqual(1)
}

export async function onboard(page: Page, handle: string) {
  await page.goto('/onboarding')
  for (let step = 1; step <= 6; step++) {
    await expect(page.getByTestId(`onboarding-step-${step}`)).toBeVisible()
    await audit(page)
    await noPageOverflow(page)
    if (step === 1) {
      for (const id of ['age-confirmed', 'terms-accepted', 'pledge-accepted'])
        await activate(page, page.locator(`#${id}`), 'Space')
    } else if (step === 2) await typeInto(page, page.locator('#handle'), handle)
    else if (step === 3) await activate(page, page.locator('#lb-public'), 'Space')
    else if (step === 4) {
      for (const track of ['logic', 'math', 'code']) {
        const checkbox = page.locator(`#track-${track}`)
        if (await checkbox.isChecked()) await activate(page, checkbox, 'Space')
      }
    } else if (step === 5) {
      await typeInto(page, page.locator('#tut1-answer'), '60')
      await activate(page, page.getByRole('button', { name: '90%', exact: true }).first())
      await activate(page, page.getByRole('button', { name: 'Check Example 1' }))
      await typeInto(page, page.locator('#tut2-answer'), 'no')
      await activate(page, page.getByRole('button', { name: '99%', exact: true }).last())
      await activate(page, page.getByRole('button', { name: 'Check Example 2' }))
    }
    await activate(page, step === 6 ? page.getByTestId('submit-onboarding') : page.getByRole('button', { name: 'Continue', exact: true }))
  }
  await expect(page.getByTestId('today-container')).toBeVisible()
}
