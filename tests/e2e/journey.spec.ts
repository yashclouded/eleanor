import { readFile } from 'node:fs/promises'
import postgres from 'postgres'
import { adminClient } from '../api/helpers.ts'
import { activate, audit, expect, noPageOverflow, onboard, signIn, test, typeInto, type Page } from './fixtures.ts'
import type { Answer, AnswerSpec } from '../../supabase/functions/_shared/content/types.ts'

const testSql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', { prepare: false, max: 2 })
test.afterAll(() => testSql.end())

async function commit(page: Page, attemptId: string, correct: boolean) {
  const [secret] = await testSql<{ answer: Answer; answer_spec: AnswerSpec | string }[]>`
    select s.answer, i.answer_spec from attempts a
    join instances i on i.id = a.instance_id join instance_secrets s on s.instance_id = i.id
    where a.id = ${attemptId}`
  const spec: AnswerSpec = typeof secret.answer_spec === 'string' ? JSON.parse(secret.answer_spec) : secret.answer_spec
  const answer: Answer = typeof secret.answer === 'string' ? JSON.parse(secret.answer) : secret.answer
  if (spec.type === 'choice') {
    const choice = spec.options.find(o => correct ? o.id === answer : o.id !== answer)!
    await activate(page, page.getByRole('radio').first(), 'Space')
    for (let i = 0; i < spec.options.indexOf(choice); i++) await page.keyboard.press('ArrowRight')
  } else {
    expect(['number', 'integer', 'estimate']).toContain(spec.type)
    const wrong = spec.type === 'estimate' ? String(Number(answer) * 100000) : '-123456789'
    await typeInto(page, page.getByTestId('answer-input'), correct ? String(answer) : wrong)
  }
  await typeInto(page, page.getByTestId('confidence-input'), '70')
  await activate(page, page.getByRole('button', { name: 'Commit', exact: true }))
  await expect(page.getByTestId('result-outcome')).toContainText(correct ? 'Correct' : 'Incorrect')
}

for (const scenario of [
  { name: 'keyboard only', width: 1280, zoom: 1 },
  { name: 'desktop at 200%', width: 1280, zoom: 2 },
  { name: 'mobile at 200%', width: 375, zoom: 2 },
]) {
  test(`new learner journey: ${scenario.name}`, async ({ page }) => {
    test.setTimeout(180000)
    const today = new Date()
    // Advance a day without expiring Auth tokens, whose server still uses real time.
    await page.clock.setFixedTime(new Date(today.getTime() - 86400000))
    await page.setViewportSize({ width: scenario.width, height: 900 })
    const user = await signIn(page, 'journey', false)
    await page.addInitScript(zoom => {
      document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = String(zoom) })
    }, scenario.zoom)
    try {
      await onboard(page, user.handle)
      await expect(page.locator('html')).toHaveCSS('zoom', String(scenario.zoom))
      await expect(page.getByTestId('track-card-judgment')).toContainText('(provisional)')
      await testSql`update profiles set set_size = 8 where id = ${user.userId}`
      await activate(page, page.getByRole('button', { name: 'Start judgment set', exact: true }))
      let firstAttempt = ''
      let firstConcept = ''
      for (let slot = 0; slot < 8; slot++) {
        await expect(page.getByTestId('presented-state')).toBeVisible()
        await noPageOverflow(page)
        const [attempt] = await testSql`select id, concept_id from attempts where user_id = ${user.userId}
          and kind = 'placement' and state = 'presented' order by presented_at desc limit 1`
        expect(attempt).toBeDefined()
        if (slot === 0) { firstAttempt = attempt.id; firstConcept = attempt.concept_id }
        if (slot === 2 || slot === 5) {
          await activate(page, page.getByRole('button', { name: "I'm stuck", exact: true }))
          await activate(page, page.getByRole('button', { name: 'Confirm give up', exact: true }))
          await expect(page.getByTestId('result-panel')).toBeVisible()
        } else await commit(page, attempt.id, slot !== 0 && slot !== 4)
        // Keep placement eligibility stable while exercising mixed outcomes and mastery.
        await testSql`update track_ratings set rating = greatest(rating,
          (select max(entry_rating) + 100 from concepts where track_id = 'judgment')) where user_id = ${user.userId}`
        if (slot === 0) {
          await activate(page, page.getByRole('link', { name: 'Progress', exact: true }))
          await expect(page.getByTestId(`concept-tile-${firstConcept}`).getByTestId('concept-state-badge')).toHaveText('Learning')
          await noPageOverflow(page)
          await activate(page, page.getByRole('link', { name: 'Today', exact: true }))
          await activate(page, page.getByRole('button', { name: 'Resume judgment set', exact: true }))
          await expect(page.getByTestId('result-panel')).toBeVisible()
        }
        await audit(page)
        await noPageOverflow(page)
        await activate(page, page.getByRole('button', { name: 'Reveal solution', exact: true }))
        await expect(page.getByTestId('reveal-panel')).toBeVisible()
        await noPageOverflow(page)
        await activate(page, page.getByRole('button', { name: 'Next problem', exact: true }))
      }
      await expect(page.getByTestId('set-summary')).toBeVisible()
      await noPageOverflow(page)
      const [track] = await testSql`select n from track_ratings where user_id = ${user.userId} and track_id = 'judgment'`
      expect(track.n).toBe(8)
      const outcomes = await testSql`select outcome, count(*)::int as n from attempts where user_id = ${user.userId}
        and kind = 'placement' group by outcome order by outcome`
      expect(outcomes).toEqual([{ outcome: 'correct', n: 4 }, { outcome: 'gave_up', n: 2 }, { outcome: 'incorrect', n: 2 }])
      // Placement count and provisional RD are separate gates; force only the latter's boundary.
      await testSql`update track_ratings set rd = 105, last_at = now() where user_id = ${user.userId}`
      await activate(page, page.getByRole('button', { name: 'Another set', exact: true }))
      await expect(page.getByTestId('track-card-judgment')).not.toContainText('(provisional)')
      const [echo] = await testSql`select e.id, e.due_at, a.resolved_at from echoes e join attempts a on a.id = e.source_attempt_id
        where e.user_id = ${user.userId} and e.source_attempt_id = ${firstAttempt} and e.status = 'due'`
      expect(new Date(echo.due_at).getTime() - new Date(echo.resolved_at).getTime()).toBe(86400000)
      await page.clock.setFixedTime(today)
      // Advance the server fixture too, without changing the shared machine's clock.
      await testSql`update echoes set due_at = now() - interval '1 minute' where id = ${echo.id}`
      await testSql`update attempts set resolved_at = now() - interval '1 day' where id = ${firstAttempt}`
      await page.reload()
      await expect(page.getByTestId('due-echoes-count')).not.toHaveText('0 due')
      await activate(page, page.getByRole('button', { name: 'Start judgment set', exact: true }))
      await expect(page.getByText('Echo Review', { exact: true })).toBeVisible()
      const [review] = await testSql`select id, echo_id from attempts where user_id = ${user.userId} and state = 'presented' and kind = 'echo'`
      expect(review.echo_id).toBe(echo.id)
      await commit(page, review.id, true)
      await testSql`update track_ratings set rating = greatest(rating,
        (select entry_rating + 100 from concepts where id = ${firstConcept})) where user_id = ${user.userId}`
      await activate(page, page.getByRole('link', { name: 'Progress', exact: true }))
      await expect(page.getByTestId(`concept-tile-${firstConcept}`).getByTestId('concept-state-badge')).toHaveText('Practiced')
      await noPageOverflow(page)
      const beforeDaily = await testSql`select rating, rd, n from track_ratings where user_id = ${user.userId}`
      await activate(page, page.getByRole('link', { name: 'Daily', exact: true }))
      await expect(page.getByTestId('presented-state')).toBeVisible()
      await noPageOverflow(page)
      const [daily] = await testSql`select id from attempts where user_id = ${user.userId} and kind = 'daily' and state = 'presented'`
      await commit(page, daily.id, true)
      await noPageOverflow(page)
      expect(await testSql`select rating, rd, n from track_ratings where user_id = ${user.userId}`).toEqual(beforeDaily)
      await activate(page, page.getByRole('link', { name: 'Settings', exact: true }))
      await noPageOverflow(page)
      const downloadEvent = page.waitForEvent('download')
      await activate(page, page.getByTestId('export-btn'))
      const download = await downloadEvent
      const exported = JSON.parse(await readFile((await download.path())!, 'utf8'))
      expect(exported.schemaVersion).toBe(1)
      await typeInto(page, page.getByTestId('delete-handle-confirm'), user.handle)
      await activate(page, page.getByTestId('delete-account-btn'))
      await expect(page).toHaveURL(/\/login$/)
      expect(await testSql`select id from profiles where id = ${user.userId}`).toHaveLength(0)
      expect(await testSql`select id from auth.users where id = ${user.userId}`).toHaveLength(0)
    } finally { await adminClient.auth.admin.deleteUser(user.userId) }
  })
}
