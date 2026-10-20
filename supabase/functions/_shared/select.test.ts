import { describe, expect, it } from 'vitest'
import { makeRng } from './rng.ts'
import {
  type ConceptState,
  type DueEcho,
  type ItemRow,
  priority,
  selectSlot,
  type SelectionInput,
  unlocked,
} from './select.ts'

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z')

function makeConcept(partial: Partial<ConceptState> = {}): ConceptState {
  return {
    id: 'concept.a',
    prereqs: [],
    entryRating: 1000,
    rating: 1200,
    rd: 100,
    lastPractisedAt: new Date('2026-10-18T12:00:00.000Z'),
    attempted: true,
    mastery: 'practiced',
    misconceptionActive: false,
    ...partial,
  }
}

function makeSelectionInput(partial: Partial<SelectionInput> = {}): SelectionInput {
  return {
    now: FIXED_NOW,
    placement: false,
    intensity: 'balanced',
    slotIndex: 0,
    setSize: 5,
    consecutiveLosses: 0,
    trackRating: 1200,
    concepts: [makeConcept()],
    items: [
      {
        id: 'item-1',
        conceptId: 'concept.a',
        familyId: 'family.1',
        rating: 1200,
        status: 'published',
      },
    ],
    familyLastExposure: {},
    dueEchoes: [],
    echoesInSet: 0,
    conceptsUsedInSet: [],
    lastConcept: null,
    ...partial,
  }
}

describe('select.ts - problem selection engine', () => {
  describe('unlocked', () => {
    it('concepts with no prerequisites are always unlocked', () => {
      const c = makeConcept({ id: 'root', prereqs: [] })
      expect(unlocked([c], 800)).toEqual([c])
    })

    it('a prereq that is only learning blocks, practiced unlocks, trackRating >= entry + 100 unlocks regardless', () => {
      const prereq = makeConcept({
        id: 'prereq.1',
        prereqs: [],
        mastery: 'learning',
      })
      const target = makeConcept({
        id: 'target.1',
        prereqs: ['prereq.1'],
        entryRating: 1000,
        mastery: 'new',
      })

      // 1. Blocked: prereq is learning, trackRating is 1050 (< 1000 + 100)
      const res1 = unlocked([prereq, target], 1050)
      expect(res1.map((c) => c.id)).toEqual(['prereq.1'])

      // 2. Unlocked via prerequisite mastery: prereq reaches 'practiced'
      prereq.mastery = 'practiced'
      const res2 = unlocked([prereq, target], 1050)
      expect(res2.map((c) => c.id)).toContain('target.1')

      // 3. Unlocked regardless: prereq is learning again, but trackRating is 1100 (>= 1000 + 100)
      prereq.mastery = 'learning'
      const res3 = unlocked([prereq, target], 1100)
      expect(res3.map((c) => c.id)).toContain('target.1')
    })
  })

  describe('priority', () => {
    it('an active misconception adds 0.6, concept already used in set gets -1.0, unseen concept has uncertainty 1 and novelty 1', () => {
      // Unseen concept: attempted: false, rating: null, rd: null, lastPractisedAt: null
      const unseen = makeConcept({
        id: 'unseen.1',
        attempted: false,
        rating: null,
        rd: null,
        lastPractisedAt: null,
        misconceptionActive: false,
      })

      // weakness: 0
      // uncertainty: 1 (unseen) -> 0.3 * 1 = 0.3
      // staleness: 0 -> 0.3 * 0 = 0
      // novelty: 1 (never attempted) -> 0.2 * 1 = 0.2
      // misconception_active: 0 -> 0
      // used_in_this_set: 0
      // Total priority = 0.5
      const basePri = priority(unseen, {
        trackRating: 1200,
        now: FIXED_NOW,
        conceptsUsedInSet: [],
      })
      expect(basePri).toBeCloseTo(0.5, 5)

      // Active misconception adds 0.6 (0.5 + 0.6 = 1.1)
      const withMisc = makeConcept({
        ...unseen,
        misconceptionActive: true,
      })
      const priWithMisc = priority(withMisc, {
        trackRating: 1200,
        now: FIXED_NOW,
        conceptsUsedInSet: [],
      })
      expect(priWithMisc).toBeCloseTo(1.1, 5)
      expect(priWithMisc - basePri).toBeCloseTo(0.6, 5)

      // Concept already used in set gets -1.0
      const priUsed = priority(unseen, {
        trackRating: 1200,
        now: FIXED_NOW,
        conceptsUsedInSet: ['unseen.1'],
      })
      expect(priUsed).toBeCloseTo(basePri - 1.0, 5)
    })
  })

  describe('echoes', () => {
    it('two due echoes from different families fill slots 0 and 1; a third due echo waits; two due echoes from same family use only one slot', () => {
      const now = FIXED_NOW
      const due1: DueEcho = {
        id: 'echo-1',
        familyId: 'family.a',
        conceptId: 'concept.a',
        dueAt: new Date(now.getTime() - 20000), // oldest
      }
      const due2: DueEcho = {
        id: 'echo-2',
        familyId: 'family.b',
        conceptId: 'concept.a',
        dueAt: new Date(now.getTime() - 10000),
      }
      const due3: DueEcho = {
        id: 'echo-3',
        familyId: 'family.c',
        conceptId: 'concept.a',
        dueAt: new Date(now.getTime() - 5000),
      }

      const items: ItemRow[] = [
        { id: 'item-a', conceptId: 'concept.a', familyId: 'family.a', rating: 1200, status: 'published' },
        { id: 'item-b', conceptId: 'concept.a', familyId: 'family.b', rating: 1200, status: 'published' },
        { id: 'item-c', conceptId: 'concept.a', familyId: 'family.c', rating: 1200, status: 'published' },
      ]

      const inputSlot0 = makeSelectionInput({
        slotIndex: 0,
        echoesInSet: 0,
        dueEchoes: [due3, due1, due2], // Unordered due echoes
        items,
      })

      // Slot 0 chooses oldest due echo (due1, family.a)
      const sel0 = selectSlot(inputSlot0, makeRng(7))
      expect(sel0.kind).toBe('echo')
      if (sel0.kind === 'echo') {
        expect(sel0.echoId).toBe('echo-1')
        expect(sel0.itemId).toBe('item-a')
      }

      // Slot 1 chooses next oldest due echo from different family (due2, family.b)
      const inputSlot1 = makeSelectionInput({
        slotIndex: 1,
        echoesInSet: 1,
        dueEchoes: [due3, due2], // echo-1 already fulfilled
        items,
      })
      const sel1 = selectSlot(inputSlot1, makeRng(7))
      expect(sel1.kind).toBe('echo')
      if (sel1.kind === 'echo') {
        expect(sel1.echoId).toBe('echo-2')
        expect(sel1.itemId).toBe('item-b')
      }

      // Slot 2: already 2 echoes in set (echoesInSet: 2). The third due echo (due3) must wait!
      const inputSlot2 = makeSelectionInput({
        slotIndex: 2,
        echoesInSet: 2,
        dueEchoes: [due3],
        items,
      })
      const sel2 = selectSlot(inputSlot2, makeRng(7))
      expect(sel2.kind).toBe('new')

      // Case: two due echoes from the SAME family use only one slot in the set
      const sameFamilyDue1: DueEcho = {
        id: 'echo-f1',
        familyId: 'family.same',
        conceptId: 'concept.a',
        dueAt: new Date(now.getTime() - 20000),
      }
      const sameFamilyDue2: DueEcho = {
        id: 'echo-f2',
        familyId: 'family.same',
        conceptId: 'concept.a',
        dueAt: new Date(now.getTime() - 10000),
      }
      const sameItems: ItemRow[] = [
        { id: 'item-s1', conceptId: 'concept.a', familyId: 'family.same', rating: 1200, status: 'published' },
      ]

      // Slot 0 takes echo-f1
      const inputSame0 = makeSelectionInput({
        slotIndex: 0,
        echoesInSet: 0,
        dueEchoes: [sameFamilyDue1, sameFamilyDue2],
        items: sameItems,
      })
      const selSame0 = selectSlot(inputSame0, makeRng(7))
      expect(selSame0.kind).toBe('echo')
      if (selSame0.kind === 'echo') {
        expect(selSame0.echoId).toBe('echo-f1')
      }

      // Slot 1 has echoesInSet: 1, but the remaining due echo is from the SAME family, so it cannot be selected
      const inputSame1 = makeSelectionInput({
        slotIndex: 1,
        echoesInSet: 1,
        dueEchoes: [sameFamilyDue2],
        items: sameItems,
        familyLastExposure: { 'family.same': now },
        conceptsUsedInSet: ['concept.a'],
        lastConcept: 'concept.a',
      })
      const selSame1 = selectSlot(inputSame1, makeRng(7))
      expect(selSame1.kind).not.toBe('echo')
    })

    it('families exposed less than 72h ago are excluded for new items but allowed for echoes', () => {
      const now = FIXED_NOW
      const exposedRecently = new Date(now.getTime() - 24 * 3600 * 1000) // 24h ago (< 72h)

      const echoItem: ItemRow = {
        id: 'item-recent',
        conceptId: 'concept.a',
        familyId: 'family.recent',
        rating: 1200,
        status: 'published',
      }

      // 1. Allowed for echoes:
      const echoInput = makeSelectionInput({
        slotIndex: 0,
        echoesInSet: 0,
        dueEchoes: [
          {
            id: 'echo-rec',
            familyId: 'family.recent',
            conceptId: 'concept.a',
            dueAt: new Date(now.getTime() - 5000),
          },
        ],
        items: [echoItem],
        familyLastExposure: { 'family.recent': exposedRecently },
      })

      const echoSel = selectSlot(echoInput, makeRng(7))
      expect(echoSel.kind).toBe('echo')
      if (echoSel.kind === 'echo') {
        expect(echoSel.itemId).toBe('item-recent')
      }

      // 2. Excluded for new items:
      const newInput = makeSelectionInput({
        slotIndex: 0,
        echoesInSet: 0,
        dueEchoes: [],
        items: [echoItem],
        familyLastExposure: { 'family.recent': exposedRecently },
      })
      const newSel = selectSlot(newInput, makeRng(7))
      // Because family.recent was exposed 24h ago and there are no other items, selection returns none
      expect(newSel).toEqual({ kind: 'none', reason: 'no_items' })
    })
  })

  describe('concept and item choice', () => {
    it('the same concept is never chosen for consecutive slots when an alternative exists', () => {
      const conceptA = makeConcept({ id: 'concept.a' })
      const conceptB = makeConcept({ id: 'concept.b' })
      const items: ItemRow[] = [
        { id: 'item-a', conceptId: 'concept.a', familyId: 'fam.a', rating: 1200, status: 'published' },
        { id: 'item-b', conceptId: 'concept.b', familyId: 'fam.b', rating: 1200, status: 'published' },
      ]

      for (let seed = 1; seed <= 50; seed++) {
        const input = makeSelectionInput({
          concepts: [conceptA, conceptB],
          items,
          lastConcept: 'concept.a',
        })
        const sel = selectSlot(input, makeRng(seed))
        expect(sel.kind).toBe('new')
        if (sel.kind === 'new') {
          expect(sel.conceptId).toBe('concept.b')
        }
      }
    })

    it('placement chooses around trackRating (b* = trackRating at p 0.5)', () => {
      const input = makeSelectionInput({
        placement: true,
        trackRating: 1450,
        concepts: [makeConcept({ rating: 1100 })], // concept rating is 1100, but placement uses trackRating 1450
        items: [
          { id: 'item-p', conceptId: 'concept.a', familyId: 'fam.p', rating: 1450, status: 'published' },
        ],
      })
      const sel = selectSlot(input, makeRng(7))
      expect(sel.kind).toBe('new')
      if (sel.kind === 'new') {
        expect(sel.pStar).toBe(0.5)
        expect(sel.bStar).toBeCloseTo(1450, 4)
        expect(sel.itemId).toBe('item-p')
      }
    })

    it('item choice: with items rated 1340, 1360 and 1500 and b* 1352.8, only 1340/1360 are ever chosen (1,000 draws)', () => {
      // Setup balanced intensity with concept rating 1500 -> targetSuccess 0.70 -> b* = 1500 + 400*log10(0.3/0.7) ≈ 1352.8
      const concept = makeConcept({ id: 'concept.a', rating: 1500 })
      const items: ItemRow[] = [
        { id: 'item-1340', conceptId: 'concept.a', familyId: 'f1', rating: 1340, status: 'published' },
        { id: 'item-1360', conceptId: 'concept.a', familyId: 'f2', rating: 1360, status: 'published' },
        { id: 'item-1500', conceptId: 'concept.a', familyId: 'f3', rating: 1500, status: 'published' },
      ]

      const chosenIds = new Set<string>()
      for (let s = 1; s <= 1000; s++) {
        const input = makeSelectionInput({
          intensity: 'balanced',
          concepts: [concept],
          items,
        })
        const sel = selectSlot(input, makeRng(s))
        expect(sel.kind).toBe('new')
        if (sel.kind === 'new') {
          expect(sel.bStar).toBeCloseTo(1352.8, 1)
          chosenIds.add(sel.itemId)
        }
      }

      expect(chosenIds.has('item-1340')).toBe(true)
      expect(chosenIds.has('item-1360')).toBe(true)
      expect(chosenIds.has('item-1500')).toBe(false)
    })

    it('fallback: when the top concept closest item is more than 300 away, the next concept is used', () => {
      // Concept A: high priority, but only has an item rated 2000 (gap > 300 from b* ~1200)
      // Concept B: lower priority, but has an item rated 1205 (gap ~5)
      const conceptA = makeConcept({
        id: 'concept.a',
        rating: 1200,
        misconceptionActive: true, // boost priority
      })
      const conceptB = makeConcept({
        id: 'concept.b',
        rating: 1200,
        misconceptionActive: false,
      })

      const items: ItemRow[] = [
        { id: 'item-a-far', conceptId: 'concept.a', familyId: 'fam.a', rating: 2000, status: 'published' },
        { id: 'item-b-good', conceptId: 'concept.b', familyId: 'fam.b', rating: 1205, status: 'published' },
      ]

      const input = makeSelectionInput({
        concepts: [conceptA, conceptB],
        items,
      })

      const sel = selectSlot(input, makeRng(7))
      expect(sel.kind).toBe('new')
      if (sel.kind === 'new') {
        expect(sel.conceptId).toBe('concept.b')
        expect(sel.itemId).toBe('item-b-good')
      }
    })

    it('when there are no items at all -> { kind: "none", reason: "no_items" }', () => {
      const input = makeSelectionInput({
        items: [],
      })
      const sel = selectSlot(input, makeRng(7))
      expect(sel).toEqual({ kind: 'none', reason: 'no_items' })
    })

    it('when there are no unlocked concepts -> { kind: "none", reason: "no_unlocked_concepts" }', () => {
      const blocked = makeConcept({
        id: 'blocked',
        prereqs: ['nonexistent'],
        entryRating: 2000,
      })
      const input = makeSelectionInput({
        trackRating: 1000,
        concepts: [blocked],
        items: [],
      })
      const sel = selectSlot(input, makeRng(7))
      expect(sel).toEqual({ kind: 'none', reason: 'no_unlocked_concepts' })
    })

    it('determinism: the same input and seed give the exact same selection', () => {
      const conceptA = makeConcept({ id: 'concept.a' })
      const conceptB = makeConcept({ id: 'concept.b' })
      const items: ItemRow[] = [
        { id: 'item-a', conceptId: 'concept.a', familyId: 'fam.a', rating: 1200, status: 'published' },
        { id: 'item-b', conceptId: 'concept.b', familyId: 'fam.b', rating: 1210, status: 'published' },
      ]
      const input = makeSelectionInput({
        concepts: [conceptA, conceptB],
        items,
      })

      const sel1 = selectSlot(input, makeRng(42))
      const sel2 = selectSlot(input, makeRng(42))
      expect(sel1).toEqual(sel2)
    })
  })
})
