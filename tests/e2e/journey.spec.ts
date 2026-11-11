import { expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { targetSuccess } from '../../supabase/functions/_shared/model.ts'
import { test, auditPage, createLearner, enterAnswer, enterWrongAnswer, press, setLayout, type, adminClient, testSql } from './release-helpers.ts'

for (const layout of [
  { width: 1280, scale: 1, label: 'desktop' },
  { width: 640, scale: 2, label: '200% on a 1280px display' },
  { width: 375, scale: 1, label: '375px mobile' },
]) {
test(`keyboard journey at ${layout.label}: placement, echo, Daily, progress and data rights`, async ({ page }) => {
  test.setTimeout(120_000)
  await setLayout(page, layout.width, layout.scale)
  const { userId, handle } = await createLearner(page)
  try {
    await auditPage(page, 'Onboarding consent')
    for (const id of ['age-confirmed', 'terms-accepted', 'pledge-accepted']) {
      await press(page, page.locator(`#${id}`), 'Space')
    }
    await press(page, page.getByRole('button', { name: 'Continue', exact: true }))
    await auditPage(page, 'Onboarding handle')
    await type(page, page.locator('#handle'), handle)
    await press(page, page.getByRole('button', { name: 'Continue', exact: true }))
    await auditPage(page, 'Onboarding visibility')
    await press(page, page.locator('#lb-private'), 'Space')
    await press(page, page.getByRole('button', { name: 'Continue', exact: true }))
    await auditPage(page, 'Onboarding intensity')
    for (const intensity of ['steady', 'balanced', 'stretch'] as const) {
      const target = targetSuccess({ placement: false, intensity, consecutiveLosses: 0, isLastSlot: false })
      await expect(page.locator(`label[for="intensity-${intensity}"]`)).toContainText(`${Math.round(target * 100)}%`)
    }
    await press(page, page.getByRole('button', { name: 'Continue', exact: true }))
    await auditPage(page, 'Onboarding confidence tutorial')
    await type(page, page.locator('#tut1-answer'), '60')
    await press(page, page.getByRole('button', { name: '90%', exact: true }).first())
    await press(page, page.getByRole('button', { name: 'Check Example 1' }))
    await expect(page.getByRole('status').first()).toContainText('Correct!')
    await type(page, page.locator('#tut2-answer'), 'no')
    await press(page, page.getByRole('button', { name: '99%', exact: true }).last())
    await press(page, page.getByRole('button', { name: 'Check Example 2' }))
    await expect(page.getByRole('status').last()).toContainText('Exactly!')
    await press(page, page.getByRole('button', { name: 'Continue', exact: true }))
    await auditPage(page, 'Onboarding review')
    await press(page, page.getByTestId('submit-onboarding'))
    await page.waitForURL('**/today')
    await expect(page.getByTestId('track-card-judgment')).toContainText('Provisional rating')
    await testSql`update profiles set set_size = 8 where id = ${userId}`
    await press(page, page.getByRole('button', { name: 'Start judgment set', exact: true }))
    await page.waitForURL('**/train/*')
    const setId = page.url().split('/').at(-1)!
    let missedConcept = ''
    let missedFamily = ''
    for (let slot = 0; slot < 8; slot++) {
      await expect(page.getByTestId('presented-state')).toBeVisible()
      const [attempt] = await testSql`
        select a.id, a.kind, a.concept_id, a.family_id, s.answer, i.answer_spec
        from attempts a join instance_secrets s on s.instance_id = a.instance_id
        join instances i on i.id = a.instance_id
        where a.set_id = ${setId} and a.slot = ${slot}
      `
      expect(attempt.kind).toBe('placement')
      if (slot === 0) {
        missedConcept = attempt.concept_id
        missedFamily = attempt.family_id
      }
      if (slot === 2) {
        await press(page, page.getByRole('button', { name: "I'm stuck", exact: true }))
        await press(page, page.getByRole('button', { name: 'Confirm give up', exact: true }))
      } else {
        if (slot === 0) await enterWrongAnswer(page, attempt.answer_spec, attempt.answer)
        else await enterAnswer(page, attempt.answer_spec, attempt.answer)
        await press(page, page.getByRole('button', { name: '80%', exact: true }))
        await press(page, page.getByRole('button', { name: 'Commit', exact: true }))
      }
      await expect(page.getByTestId('result-outcome')).toContainText(slot === 0 ? 'Incorrect' : slot === 2 ? /stuck|gave up/i : 'Correct')
      await press(page, page.getByRole('button', { name: 'Reveal solution', exact: true }))
      await expect(page.getByTestId('reveal-panel')).toBeVisible()
      await press(page, page.getByRole('button', { name: /^(Next problem|Finish set)$/ }))
    }
    await expect(page.getByTestId('set-summary')).toBeVisible()
    const [rated] = await testSql`select n from track_ratings where user_id = ${userId} and track_id = 'judgment'`
    expect(rated.n).toBe(8)

    // Advance this learner's fixture timestamps one day; do not change the shared server clock.
    await testSql`update attempts set presented_at = presented_at - interval '1 day',
      resolved_at = resolved_at - interval '1 day' where user_id = ${userId} and set_id = ${setId}`
    await testSql`update echoes set due_at = now() - interval '1 minute'
      where user_id = ${userId} and family_id = ${missedFamily}`
    await testSql`update concept_ratings set state = 'learning', first_correct_at = null,
      rating = (select min(rating) + 147 from items where family_id = ${missedFamily} and status = 'published')
      where user_id = ${userId} and concept_id = ${missedConcept}`
    await testSql`update track_ratings set rd = 100, last_at = now() where user_id = ${userId} and track_id = 'judgment'`
    await page.goto('/progress')
    await expect(page.getByTestId(`concept-tile-${missedConcept}`).getByTestId('concept-state-badge')).toHaveText('Learning')
    await page.goto('/today')
    await expect(page.getByTestId('track-card-judgment')).not.toContainText('Provisional rating')
    await expect(page.getByTestId('due-echoes-count')).toContainText('1 due')
    await press(page, page.getByRole('button', { name: 'Start judgment set', exact: true }))
    await page.waitForURL('**/train/*')
    await expect(page.getByTestId('presented-state')).toBeVisible()
    const echoSet = page.url().split('/').at(-1)!
    const [echo] = await testSql`
      select a.kind, a.concept_id, s.answer, i.answer_spec from attempts a
      join instance_secrets s on s.instance_id = a.instance_id
      join instances i on i.id = a.instance_id
      where a.set_id = ${echoSet} and a.slot = 0
    `
    expect(echo.kind).toBe('echo')
    expect(echo.concept_id).toBe(missedConcept)
    await enterAnswer(page, echo.answer_spec, echo.answer)
    await press(page, page.getByRole('button', { name: '80%', exact: true }))
    await press(page, page.getByRole('button', { name: 'Commit', exact: true }))
    await expect(page.getByTestId('result-outcome')).toContainText('Correct')
    await page.goto('/progress')
    await expect(page.getByTestId(`concept-tile-${missedConcept}`).getByTestId('concept-state-badge')).toHaveText('Practiced')
    await page.goto('/daily')
    await expect(page.getByTestId('presented-state')).toBeVisible()
    await press(page, page.getByTestId('give-up-btn'))
    await press(page, page.getByTestId('confirm-give-up-btn'))
    await expect(page.getByTestId('crowd-stats')).toBeVisible()
    await page.goto('/settings')
    const download = page.waitForEvent('download')
    await press(page, page.getByTestId('export-btn'))
    const exported = await download
    const exportedPath = await exported.path()
    expect(exportedPath).not.toBeNull()
    const archive = JSON.parse(await readFile(exportedPath!, 'utf8'))
    expect(JSON.stringify(archive)).toContain(handle)
    await type(page, page.getByTestId('delete-handle-confirm'), handle)
    await press(page, page.getByTestId('delete-account-btn'))
    await expect(page.getByRole('link', { name: /^Sign in/ }).first()).toBeVisible()
    const [remaining] = await testSql`select count(*)::int as n from profiles where id = ${userId}`
    expect(remaining.n).toBe(0)
  } finally {
    await adminClient.auth.admin.deleteUser(userId)
  }
})
}
