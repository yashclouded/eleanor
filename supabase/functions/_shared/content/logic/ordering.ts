import type { Template } from '../types.ts'
import { labels, levels, permutations } from './helpers.ts'

type Line = { order: string[]; pairs: [string, string][]; negativeClues: boolean }
export const lineUpTemplate: Template<Line> = {
  id: 'logic.ordering.line-up', version: 1, track: 'logic', concept: 'logic.ordering', family: 'strict-order',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['deliveries', 'presentations'], dailyLevels: [4, 5],
  sample(rng, level) {
    const order = labels(rng, Math.min(6, level + 2))
    const pairs: Line['pairs'] = order.slice(1).map((name, i) => [order[i], name])
    // Reverse the clue order at higher levels, without changing the constraints.
    if (level >= 3) pairs.reverse()
    return { order, pairs, negativeClues: level === 5 }
  },
  solve(p) {
    const remaining = new Set(p.order)
    const result: string[] = []
    while (remaining.size) {
      const next = [...remaining].find((name) => !p.pairs.some(([a, b]) => b === name && remaining.has(a)))
      if (!next) throw new Error('Ordering clues contain a cycle')
      result.push(next)
      remaining.delete(next)
    }
    return result
  },
  verify(p) {
    const valid = permutations([...p.order].sort()).filter((order) => p.pairs.every(([a, b]) => order.indexOf(a) < order.indexOf(b)))
    if (valid.length !== 1) throw new Error('Line-up must have exactly one ordering')
    return valid[0]
  },
  render: (p, skin) => [
    { t: 'p', text: `Arrange ${skin === 'deliveries' ? 'deliveries' : 'presentations'} ${[...p.order].sort().join(', ')} from first to last. Each occurs once; there are no ties.` },
    { t: 'list', items: p.pairs.map(([a, b]) => p.negativeClues ? `${b} does not occur before ${a}.` : `${a} occurs before ${b}.`) },
  ],
  answer: (p) => ({ type: 'sequence', items: [...p.order].sort().map((id) => ({ id, label: id })) }),
  misconceptions: [
    { id: 'reverse-before', value: (p) => [...p.order].reverse(), feedback: () => 'This reverses the before relation. Draw each arrow from the earlier item to the later item.' },
    { id: 'swap-first-pair', value: (p) => [p.order[1], p.order[0], ...p.order.slice(2)], feedback: () => 'Swapping the first two items violates their precedence clue. Check every pair, including the first link.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many distinct items need a position?' }], answer: (p) => p.order.length, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Each listed item appears exactly once.' }] },
    { prompt: (p) => [{ t: 'p', text: `Number labels alphabetically: ${[...p.order].sort().join(', ')}. What is the number of the item with no predecessor?` }], answer: (p) => [...p.order].sort().indexOf(p.order[0]) + 1, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `${p.order[0]} has no incoming arrow and must be first.` }] },
    { prompt: () => [{ t: 'p', text: 'How many items must follow the first item?' }], answer: (p) => p.order.length - 1, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `Remove the first item and repeat. The full order is ${p.order.join(', ')}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Use a directed arrow for each “before” clue. Repeatedly choose the only item with no remaining predecessor. The chain is ${p.order.join(' → ')}. Every clue points forwards in this order, so it satisfies all constraints; each next item is forced.` }],
}

type Schedule = { tasks: string[]; durations: number[]; gap: number }
export const scheduleTemplate: Template<Schedule> = {
  id: 'logic.ordering.schedule', version: 1, track: 'logic', concept: 'logic.ordering', family: 'serial-schedule',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['lab', 'studio'], dailyLevels: [4, 5],
  sample(rng, level) {
    const tasks = labels(rng, Math.min(6, level + 2))
    return { tasks, durations: tasks.map(() => rng.int(2, 8)), gap: level >= 3 ? rng.int(1, 4) : 0 }
  },
  solve: (p) => p.durations.reduce((sum, d) => sum + d, 0) + p.gap * (p.tasks.length - 1),
  verify(p) {
    let minute = 0
    for (let i = 0; i < p.tasks.length; i++) {
      let remaining = p.durations[i]
      while (remaining > 0) { minute++; remaining-- }
      if (i < p.tasks.length - 1) for (let g = 0; g < p.gap; g++) minute++
    }
    return minute
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'lab' ? 'A lab station' : 'A recording studio'} runs one task at a time, starting at minute 0. Each task must finish before the next starts. Use the order ${p.tasks.join(' → ')}. Leave exactly ${p.gap} idle minutes between consecutive tasks, and none before the first or after the last.` },
    { t: 'table', head: ['Task', 'Duration (minutes)'], rows: p.tasks.map((name, i) => [name, String(p.durations[i])]) },
    { t: 'p', text: 'At what minute does the final task finish if no extra idle time is added?' },
  ],
  answer: () => ({ type: 'integer', unit: 'minutes' }),
  misconceptions: [
    { id: 'parallel-not-serial', value: (p) => Math.max(...p.durations), feedback: () => 'The longest duration would matter for simultaneous tasks. Here all tasks share one station and run in sequence.' },
    { id: 'gap-after-final', value: (p) => p.durations.reduce((a, b) => a + b, 0) + Math.max(1, p.gap) * p.tasks.length, feedback: (p) => p.gap ? 'There is no gap after the final task. With n tasks there are n − 1 gaps.' : 'The schedule specifies zero idle time. Do not add a minute between or after tasks.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What is the sum of the task durations, without idle time?' }], answer: (p) => p.durations.reduce((a, b) => a + b, 0), tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `Add ${p.durations.join(' + ')} because tasks cannot overlap.` }] },
    { prompt: () => [{ t: 'p', text: 'How many gaps lie between consecutive tasks?' }], answer: (p) => p.tasks.length - 1, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'There is one fewer gap than tasks.' }] },
    { prompt: () => [{ t: 'p', text: 'At what minute does the final task finish?' }], answer: (p) => p.durations.reduce((a, b) => a + b, 0) + p.gap * (p.tasks.length - 1), tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `Add the durations and ${(p.tasks.length - 1) * p.gap} idle minutes.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Draw a timeline starting at 0: ${p.tasks.map((t, i) => `${t} (${p.durations[i]} minutes)`).join(`, then ${p.gap} idle minutes, then `)}. The work totals ${p.durations.reduce((a, b) => a + b, 0)} minutes and the ${p.tasks.length - 1} gaps total ${p.gap * (p.tasks.length - 1)}. Finish at minute ${p.durations.reduce((a, b) => a + b, 0) + p.gap * (p.tasks.length - 1)}.` }],
}
