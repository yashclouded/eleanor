import { adminClient, call } from '../api/helpers.ts'
import { audit, expect, noPageOverflow, onboard, signIn, test } from './fixtures.ts'

for (const theme of ['light', 'dark'] as const) {
  for (const signedIn of [false, true]) {
    test(`every route: ${signedIn ? 'signed in' : 'signed out'}, ${theme}`, async ({ page }) => {
      test.setTimeout(120000)
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      let user: Awaited<ReturnType<typeof signIn>> | undefined
      try {
        if (signedIn) user = await signIn(page, `axe_${theme}`, true, true)
        const routes = ['/', '/login', '/onboarding', '/today', '/daily', '/progress', '/playbook',
          '/leaderboard', '/leaderboard/judgment', `/u/${user?.handle ?? 'unknown_user'}`, '/settings', '/admin', '/terms', '/privacy', '/legal']
        if (user) {
          const response = await call('/sets', { transitionId: crypto.randomUUID(), track: 'judgment', mode: 'rated' }, user.token)
          expect(response.status).toBe(200)
          routes.push(`/train/${response.data.data.set.id}`)
        } else routes.push('/train/00000000-0000-4000-8000-000000000000')
        for (const route of routes) {
          await test.step(route, async () => {
            await page.setViewportSize({ width: 1280, height: 900 })
            await page.goto(route)
            await expect(page.getByRole('main')).toBeVisible()
            await expect(page.getByRole('heading').first()).toBeVisible()
            await page.waitForLoadState('networkidle')
            await audit(page)
            for (const [width, zoom] of [[1280, 1], [1280, 2], [375, 1], [375, 2]]) {
              await page.setViewportSize({ width, height: 900 })
              await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom) }, zoom)
              await noPageOverflow(page)
            }
          })
        }
      } finally {
        if (user) await adminClient.auth.admin.deleteUser(user.userId)
      }
    })
  }
  test(`all onboarding steps: ${theme}`, async ({ page }) => {
    test.setTimeout(120000)
    await page.emulateMedia({ colorScheme: theme })
    const user = await signIn(page, `onboard_${theme}`, false)
    try { await onboard(page, user.handle) }
    finally { await adminClient.auth.admin.deleteUser(user.userId) }
  })
  test(`all rating badge variants: ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await page.getByRole('main').evaluate(main => {
      const gallery = document.createElement('div')
      for (const title of ['Novice', 'Apprentice', 'Thinker', 'Analyst', 'Strategist', 'Expert', 'Master', 'Grandmaster', 'Legend']) {
        const badge = document.createElement('span')
        badge.className = `title-badge title-${title.toLowerCase()}`
        badge.textContent = title
        gallery.append(badge)
      }
      main.append(gallery)
    })
    await audit(page)
  })
}
