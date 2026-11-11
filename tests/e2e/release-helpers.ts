import { test as baseTest, expect, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createClient } from '@supabase/supabase-js'
import { adminClient, testSql, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, answerInput } from '../api/helpers.ts'
import type { Answer, AnswerSpec } from '../../supabase/functions/_shared/content/types.ts'

export { adminClient, testSql }

export const test = baseTest.extend<Record<never, never>, { databaseConnection: undefined }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured fixture argument.
  databaseConnection: [async ({}, use) => {
    try { await use(undefined) }
    finally { await testSql.end() }
  }, { scope: 'worker', auto: true }],
})

export async function setLayout(page: Page, width: number, scale: number) {
  const cdp = await page.context().newCDPSession(page)
  // Match browser zoom's CSS viewport and pixel ratio, including reflow.
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height: Math.round(900 / scale), deviceScaleFactor: scale, mobile: false,
    screenWidth: width * scale, screenHeight: 900,
  })
}

export async function press(page: Page, control: Locator, key = 'Enter') {
  await control.focus()
  await expect(control).toBeFocused()
  await page.keyboard.press(key)
}

export async function type(page: Page, control: Locator, text: string) {
  await control.focus()
  await page.keyboard.type(text)
}

export async function enterAnswer(page: Page, storedSpec: AnswerSpec | string, answer: Answer) {
  const spec: AnswerSpec = typeof storedSpec === 'string' ? JSON.parse(storedSpec) : storedSpec
  const raw = answerInput(answer)
  if (spec.type === 'choice') {
    const option = spec.options.find((option) => option.id === raw)!
    await press(page, page.getByRole('radio', { name: option.label, exact: true }), 'Space')
  } else if (spec.type === 'multi') {
    for (const option of spec.options.filter((option) => raw.includes(option.id))) {
      await press(page, page.getByRole('checkbox', { name: option.label, exact: true }), 'Space')
    }
    if (raw.length === 0) {
      const checkbox = page.getByRole('checkbox', { name: spec.options[0].label, exact: true })
      await press(page, checkbox, 'Space')
      await press(page, checkbox, 'Space')
    }
  } else if (spec.type === 'sequence') {
    const order = spec.items.map((item) => item.id)
    for (const [index, id] of [...raw].entries()) {
      let position = order.indexOf(id)
      const label = spec.items.find((item) => item.id === id)!.label
      while (position > index) {
        await press(page, page.getByRole('button', { name: `Move ${label} up`, exact: true }))
        const previous = order[position - 1]
        order[position - 1] = order[position]
        order[position] = previous
        position--
      }
    }
    if (await page.getByRole('button', { name: 'Use this order', exact: true }).isEnabled()) {
      await press(page, page.getByRole('button', { name: 'Use this order', exact: true }))
    }
  } else {
    await type(page, page.locator('#answer-input'), String(raw))
  }
}

export async function enterWrongAnswer(page: Page, storedSpec: AnswerSpec | string, answer: Answer) {
  const spec: AnswerSpec = typeof storedSpec === 'string' ? JSON.parse(storedSpec) : storedSpec
  const raw = answerInput(answer)
  let wrong: Answer
  if (spec.type === 'choice') wrong = spec.options.find((option) => option.id !== raw)!.id
  else if (spec.type === 'multi') {
    const first = spec.options[0].id
    wrong = spec.options.filter((option) => raw.includes(option.id) !== (option.id === first)).map((option) => option.id)
  } else if (spec.type === 'sequence') wrong = [raw[1], raw[0], ...raw.slice(2)]
  else wrong = Math.abs(Number(raw)) * 1_000_000 + 1_000_000
  await enterAnswer(page, spec, wrong)
}

export async function createLearner(page: Page, options: { onboarded?: boolean; admin?: boolean } = {}) {
  const handle = `rel_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
  const email = `${handle}@example.com`
  const { data, error } = await adminClient.auth.admin.createUser({
    email, email_confirm: true,
    app_metadata: options.admin ? { role: 'admin' } : {},
  })
  if (error || !data.user) throw error ?? new Error('No test user returned')
  const userId = data.user.id
  if (options.onboarded) {
    await testSql`
      insert into profiles (id, handle, age_confirmed_at, terms_accepted_at,
        pledge_accepted_at, leaderboard_visible, tracks, theme)
      values (${userId}, ${handle}, now(), now(), now(), false,
        '{judgment,logic,math,code}'::text[], 'system')
    `
  }
  const { data: link, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink', email,
  })
  if (linkError || !link.properties?.hashed_token) {
    await adminClient.auth.admin.deleteUser(userId)
    throw linkError ?? new Error('No sign-in link returned')
  }
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: auth, error: authError } = await client.auth.verifyOtp({
      token_hash: link.properties.hashed_token, type: 'magiclink',
    })
    if (authError || !auth.session) throw authError ?? new Error('No test session returned')
    await page.goto('/login')
    // Use the public auth API; email delivery and the PKCE callback have separate auth tests.
    await page.evaluate(async (session) => {
      const moduleUrl = new URL('/src/lib/supabase.ts', location.origin).href
      const { supabase } = await import(moduleUrl)
      const { error } = await supabase.auth.setSession(session)
      if (error) throw new Error(error.message)
    }, { access_token: auth.session.access_token, refresh_token: auth.session.refresh_token })
    await page.goto(options.onboarded ? '/today' : '/onboarding')
    await page.waitForURL(options.onboarded ? '**/today' : '**/onboarding', { timeout: 15_000 })
    return { userId, handle }
  } catch (error) {
    await adminClient.auth.admin.deleteUser(userId)
    throw error
  }
}

export async function auditPage(page: Page, context: string) {
  await expect(page.locator('main')).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect.soft(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
    .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), context).toEqual([])
  const layout = await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= innerWidth,
    overflow: Array.from(document.querySelectorAll('main *'))
      .filter((element) => element.getBoundingClientRect().right > innerWidth)
      .slice(0, 6).map((element) => ({ tag: element.tagName, class: element.className,
        text: element.textContent?.slice(0, 50), right: element.getBoundingClientRect().right })),
  }))
  expect.soft(layout.fits, `${context}: ${JSON.stringify(layout.overflow)}`).toBe(true)
}
