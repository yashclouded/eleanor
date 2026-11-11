import { expect } from '@playwright/test'
import { test, adminClient, auditPage, createLearner, press, setLayout } from './release-helpers.ts'

const publicRoutes = ['/', '/login', '/terms', '/privacy', '/legal', '/leaderboard', '/leaderboard/judgment']
const learnerRoutes = ['/onboarding', '/today', '/daily', '/progress', '/playbook', '/settings', '/admin']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`every route in ${colorScheme}, signed out and signed in`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    for (const route of [...publicRoutes, ...learnerRoutes, '/train/00000000-0000-4000-8000-000000000001', '/u/missing_user']) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await auditPage(page, `signed out ${colorScheme} ${route}`)
    }
    const newcomer = await createLearner(page)
    try {
      await expect(page.getByTestId('onboarding-step-1')).toBeVisible()
      await auditPage(page, `onboarding ${colorScheme}`)
    } finally {
      await adminClient.auth.admin.deleteUser(newcomer.userId)
    }
    const learner = await createLearner(page, { onboarded: true, admin: true })
    try {
      const trainRoutes: string[] = []
      for (const track of ['judgment', 'logic', 'math', 'code']) {
        await page.goto('/today')
        await press(page, page.getByRole('button', { name: `Start ${track} set`, exact: true }))
        await page.waitForURL('**/train/*')
        trainRoutes.push(new URL(page.url()).pathname)
      }
      for (const route of [...publicRoutes, ...learnerRoutes, `/u/${learner.handle}`, ...trainRoutes]) {
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        await auditPage(page, `signed in ${colorScheme} ${route}`)
      }
    } finally {
      await adminClient.auth.admin.deleteUser(learner.userId)
    }
  })
}

for (const layout of [{ width: 375, scale: 1, label: '375px mobile' }, { width: 640, scale: 2, label: '200% on a 1280px display' }]) {
  test(`keyboard controls and route layouts at ${layout.label}`, async ({ page }) => {
    test.setTimeout(120_000)
    // A 640 CSS-pixel viewport at scale 2 models browser zoom/reflow on a 1280-pixel display.
    await setLayout(page, layout.width, layout.scale)
    for (const route of publicRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await auditPage(page, `${layout.label} ${route}`)
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toHaveCount(1)
    }
    const learner = await createLearner(page, { onboarded: true, admin: true })
    try {
      await press(page, page.getByRole('button', { name: 'Start judgment set', exact: true }))
      await page.waitForURL('**/train/*')
      const train = new URL(page.url()).pathname
      for (const route of ['/today', '/daily', '/progress', '/playbook', '/settings', '/admin', `/u/${learner.handle}`, train]) {
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        await auditPage(page, `${layout.label} ${route}`)
      }
      await page.screenshot({ path: test.info().outputPath('layout.png'), fullPage: true })
    } finally {
      await adminClient.auth.admin.deleteUser(learner.userId)
    }
  })
}
