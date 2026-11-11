import { describe, expect, it } from 'vitest'
import { applyResponse, PARAMS, type Rating } from '../supabase/functions/_shared/model.ts'
import { assertReplayTarget, replay, type ReplayAttempt, type ReplayItem } from './model-replay.ts'

const start = new Date('2026-01-01T00:00:00Z')
const item: ReplayItem = { id: 'item', initialRating: 1100, anchor: false, anchoredAt: null, rating: 1100, rd: 250 }
const attempts: ReplayAttempt[] = Array.from({ length: 40 }, (_, n) => ({
  id: String(n).padStart(3, '0'), userId: 'learner', trackId: 'judgment', conceptId: 'concept',
  itemId: 'item', resolvedAt: new Date(start.getTime() + n * 1000), outcome: n % 4 === 0 ? 'incorrect' : 'correct', kind: 'selected',
}))

describe('deterministic model replay', () => {
  it('matches the live applyResponse fold, including item updates and concept initialization', () => {
    let track: Rating = { r: PARAMS.r0, rd: PARAMS.rd0Learner, lastAt: null }
    let concept: Rating | null = null
    let currentItem: Rating = { r: item.initialRating, rd: PARAMS.rd0Item, lastAt: null }
    let itemN = 0
    for (const a of attempts) {
      const next = applyResponse({ track, concept, item: { ...currentItem, anchor: false }, s: a.outcome === 'correct' ? 1 : 0, now: a.resolvedAt })
      track = next.track
      concept = next.concept
      currentItem = next.item
      itemN += Number(next.itemUpdated)
    }
    const result = replay(attempts.slice().reverse(), [item], new Map([['concept', 1000]]))
    expect(result.tracks.get('learner:judgment')).toMatchObject({ ...track, n: 40 })
    expect(result.concepts.get('learner:concept')).toMatchObject(concept!)
    expect(result.items.get('item')).toMatchObject({ r: currentItem.r, rd: currentItem.rd, n: itemN })
    expect(itemN).toBeGreaterThan(0)
    expect(result.events.filter((e) => e.subject_type === 'item')).toHaveLength(itemN)
  })

  it('removing one learner changes only shared-item effects for other learners', () => {
    const other = attempts.map((a) => ({ ...a, id: `other${a.id}`, userId: 'other', resolvedAt: new Date(a.resolvedAt.getTime() + 500) }))
    const unrelated = other.map((a) => ({ ...a, id: `third${a.id}`, userId: 'third', itemId: 'separate' }))
    const items = [item, { ...item, id: 'separate' }]
    const before = replay([...attempts, ...other, ...unrelated], items)
    const after = replay([...other, ...unrelated], items)
    expect(after.tracks.has('learner:judgment')).toBe(false)
    expect(after.tracks.get('third:judgment')).toEqual(before.tracks.get('third:judgment'))
    expect(after.tracks.get('other:judgment')!.r).not.toBe(before.tracks.get('other:judgment')!.r)
    expect(after.items.get('separate')).toEqual(before.items.get('separate'))
  })

  it('refreezes anchors at their recorded current values at the anchor timestamp', () => {
    const anchor = { ...item, anchor: true, anchoredAt: attempts[20].resolvedAt, rating: 1400, rd: 35 }
    const result = replay(attempts, [anchor])
    expect(result.items.get('item')).toMatchObject({ r: 1400, rd: 35 })
    expect(result.events.filter((e) => e.subject_type === 'item').every((e) => e.created_at < anchor.anchoredAt)).toBe(true)
    const final = result.events.filter((e) => e.subject_type === 'track').at(-1)!
    expect(final.r_after).toBe(result.tracks.get('learner:judgment')!.r)
  })

  it('rejects incomplete anchor history instead of silently changing anchored ratings', () => {
    expect(() => replay(attempts, [{ ...item, anchor: true }])).toThrow(/anchor timestamp/i)
  })
})

describe('replay apply guard', () => {
  it('allows local apply and remote dry runs, but requires explicit production confirmation elsewhere', () => {
    expect(() => assertReplayTarget('postgresql://postgres:pw@127.0.0.1:54322/postgres', true, false)).not.toThrow()
    expect(() => assertReplayTarget('postgresql://postgres:pw@[::1]:54322/postgres', true, false)).not.toThrow()
    expect(() => assertReplayTarget('postgresql://postgres:pw@db.example.com/postgres', false, false)).not.toThrow()
    expect(() => assertReplayTarget('postgresql://postgres:pw@db.example.com/postgres', true, false)).toThrow(/confirm-production/)
    expect(() => assertReplayTarget('postgresql://postgres:pw@localhost.evil.test/postgres', true, false)).toThrow(/confirm-production/)
    expect(() => assertReplayTarget('not a database URL localhost', true, true)).toThrow(/database URL/i)
  })
})
