import { expect } from '@playwright/test'
import { test, adminClient, auditPage, createLearner } from './release-helpers.ts'

test('name, photo and effects persist; uploads validate; failed saves retain edits', async ({ page }, testInfo) => {
  const learner = await createLearner(page, { onboarded: true })
  try {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Essential only', exact: true }).click()
    await page.getByLabel('Display name', { exact: true }).fill('Mira Sen')
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480
      const context = canvas.getContext('2d')!
      context.fillStyle = '#682f3c'
      context.fillRect(0, 0, 640, 480)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    await page.getByLabel('Profile picture', { exact: true }).setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
    const photo = page.locator('.profile-editor img')
    await expect(photo).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(256)
    await page.getByRole('checkbox', { name: /Sound effects/ }).uncheck()
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Sound effects/ })).not.toBeChecked()

    await page.getByRole('checkbox', { name: /Sound effects/ }).uncheck()
    await page.getByRole('checkbox', { name: /Answer celebrations/ }).uncheck()
    await page.getByRole('radio', { name: /Public on leaderboards/ }).check()
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
    await expect(page.getByText('Settings saved successfully.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Display name', { exact: true })).toHaveValue('Mira Sen')
    await expect(photo).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Sound effects/ })).not.toBeChecked()
    await expect(page.getByRole('checkbox', { name: /Answer celebrations/ })).not.toBeChecked()
    await page.goto(`/u/${learner.handle}`)
    await expect(page.getByRole('heading', { name: 'Mira Sen', exact: true })).toBeVisible()
    await expect(page.getByTestId('profile-header').locator('img')).toBeVisible()
    await page.getByRole('link', { name: 'Edit profile', exact: true }).click()

    await page.getByLabel('Profile picture', { exact: true }).setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') })
    await expect(page.getByRole('alert')).toHaveText('Choose a JPEG, PNG or WebP photo.')
    await expect(photo).toBeVisible()
    await page.getByLabel('Display name', { exact: true }).fill('Unsaved name')
    await page.route('**/rest/v1/profiles?*', async (route) => {
      if (route.request().method() === 'PATCH') await route.fulfill({ status: 503, json: { message: 'Temporary failure' } })
      else await route.continue()
    })
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Your edits are still here')
    await expect(page.getByLabel('Display name', { exact: true })).toHaveValue('Unsaved name')
    await page.unroute('**/rest/v1/profiles?*')
    await page.reload()
    await expect(page.getByLabel('Display name', { exact: true })).toHaveValue('Mira Sen')

    await page.setViewportSize({ width: 320, height: 900 })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.screenshot({ path: testInfo.outputPath('profile-settings.png'), fullPage: true })
    await auditPage(page, 'Profile settings at 320px')
    await page.getByRole('button', { name: 'Remove photo', exact: true }).click()
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible()
    await page.reload()
    await expect(photo).toHaveCount(0)
  } finally { await adminClient.auth.admin.deleteUser(learner.userId) }
})
