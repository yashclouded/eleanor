import type { Template } from '../types.ts'
import { labels, levels } from './helpers.ts'

type Lamps = { names: string[]; start: number[]; target: number[] }
function forcedMoves(p: Lamps): number {
  let previous = 0, moves = 0
  for (let i = 0; i < p.start.length - 1; i++) {
    previous = p.start[i] ^ p.target[i] ^ previous
    moves += previous
  }
  return (p.start.at(-1)! ^ previous) === p.target.at(-1) ? moves : -1
}
export const parityMovesTemplate: Template<Lamps> = {
  id: 'logic.invariants.parity-moves', version: 1, track: 'logic', concept: 'logic.invariants', family: 'adjacent-pair-toggle',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['lamps', 'tiles'], dailyLevels: [4, 5],
  sample(rng, level) {
    const names = labels(rng, level + 3)
    const start = names.map(() => rng.int(0, 1))
    const target = names.map(() => rng.int(0, 1))
    if (start.every((v, i) => v === target[i])) target[0] ^= 1
    return { names, start, target }
  },
  solve: forcedMoves,
  verify(p) {
    const encode = (bits: number[]) => bits.reduce((mask, b, i) => mask | b << i, 0)
    const start = encode(p.start), target = encode(p.target)
    const queue = [{ mask: start, moves: 0 }]
    const seen = new Set([start])
    for (let head = 0; head < queue.length; head++) {
      const { mask, moves } = queue[head]
      if (mask === target) return moves
      for (let i = 0; i < p.names.length - 1; i++) {
        const next = mask ^ (3 << i)
        if (!seen.has(next)) { seen.add(next); queue.push({ mask: next, moves: moves + 1 }) }
      }
    }
    return -1
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'lamps' ? 'A row of lamps uses 1 for on and 0 for off' : 'A row of reversible tiles uses 1 for dark and 0 for light'}. One move flips exactly two adjacent positions. The row does not wrap around. Any adjacent pair may be flipped repeatedly.` },
    { t: 'table', head: ['Position', 'Start', 'Target'], rows: p.names.map((name, i) => [name, String(p.start[i]), String(p.target[i])]) },
    { t: 'p', text: 'What is the minimum number of moves to reach the target? Enter −1 if it is impossible.' },
  ],
  answer: () => ({ type: 'integer', unit: 'moves' }),
  misconceptions: [
    { id: 'flip-one-position-at-a-time', value: (p) => p.start.filter((v, i) => v !== p.target[i]).length, feedback: () => 'Moves flip adjacent pairs, not individual positions. Fixing one position also changes its neighbour.' },
    { id: 'ignore-target', value: () => 0, feedback: () => 'Zero moves preserves the starting row. Compare it with the target before assuming no changes are needed.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'Is the number of positions that differ odd? Enter 1 for odd, 0 for even.' }], answer: (p) => p.start.filter((v, i) => v !== p.target[i]).length % 2, tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Flipping two bits preserves the parity of the total number of 1s. An odd number of differences makes the target unreachable.' }] },
    { prompt: () => [{ t: 'p', text: 'Must the first adjacent pair be flipped an odd number of times? Enter 1 for yes, 0 for no.' }], answer: (p) => p.start[0] ^ p.target[0], tolerance: { abs: 0 }, explain: () => [{ t: 'p', text: 'Only the first pair affects the first position. Its required parity is forced by the first difference.' }] },
    { prompt: () => [{ t: 'p', text: 'Continue left to right. What is the minimum move count, or −1 if the last position cannot match?' }], answer: forcedMoves, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `After fixing each position, the next pair is forced. Flipping any pair twice cancels, so each required pair is used once. The result is ${forcedMoves(p)}.` }] },
  ],
  solution(p) {
    const flips: string[] = []
    let previous = 0
    for (let i = 0; i < p.names.length - 1; i++) {
      previous ^= p.start[i] ^ p.target[i]
      if (previous) flips.push(`${p.names[i]}–${p.names[i + 1]}`)
    }
    return [{ t: 'p', text: `Pair flips preserve parity. Sweep from left to right: a mismatch at the current position forces its right-hand pair to flip. The forced pairs are ${flips.join(', ') || 'none'}. ${forcedMoves(p) < 0 ? 'The last position still differs, so no solution exists: −1.' : `The last position matches. Use each forced pair once for ${flips.length} moves; any extra two flips cancel, so this is minimal.`}` }]
  },
}

type Game = { stones: number; maximum: number; misere: boolean }
function winningMove(p: Game): number {
  const residue = (p.stones - (p.misere ? 1 : 0)) % (p.maximum + 1)
  return residue === 0 ? -1 : residue
}
export const takeAwayTemplate: Template<Game> = {
  id: 'logic.games.take-away', version: 1, track: 'logic', concept: 'logic.games', family: 'subtraction-game',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['tokens', 'crates'], dailyLevels: [4, 5],
  sample(rng, level) {
    const maximum = level === 1 ? 2 : level === 2 || level === 4 ? 3 : rng.int(3, level + 2)
    return { stones: rng.int(8, 100), maximum, misere: level >= 4 }
  },
  solve: winningMove,
  verify(p) {
    const win: boolean[] = [p.misere]
    const moves: number[] = []
    for (let n = 1; n <= p.stones; n++) {
      win[n] = false
      for (let move = 1; move <= Math.min(n, p.maximum); move++) {
        if (p.misere && move === n) continue
        if (!win[n - move]) {
          win[n] = true
          if (n === p.stones) moves.push(move)
        }
      }
    }
    if (moves.length > 1) throw new Error('Expected one winning first move')
    return moves[0] ?? -1
  },
  render: (p, skin) => [
    { t: 'p', text: `Two players alternate removing ${skin === 'tokens' ? 'tokens' : 'small crates'} from a single pile of ${p.stones}. Each turn removes between 1 and ${p.maximum}, inclusive, and cannot remove more than remain. ${p.misere ? 'The player taking the last object loses.' : 'The player taking the last object wins.'} Both players play perfectly.` },
    { t: 'p', text: 'You move first. How many objects should you remove to force a win? Enter −1 if there is no winning first move.' },
  ],
  answer: () => ({ type: 'integer', unit: 'objects' }),
  misconceptions: [
    { id: 'greedy-maximum', value: (p) => p.maximum, feedback: () => 'Taking as many as possible is not a strategy by itself. Leave the opponent a losing position under the stated last-object rule.' },
    { id: 'always-take-one', value: () => 1, feedback: () => 'Taking one only works for particular pile sizes. Classify losing positions first, then choose a move into that class.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'What is the sum of a move and the complementary reply that completes a full cycle?' }], answer: (p) => p.maximum + 1, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `If one player removes x, the reply can remove ${p.maximum + 1} − x, giving a total of ${p.maximum + 1}.` }] },
    { prompt: () => [{ t: 'p', text: 'What remainder do losing positive pile sizes have modulo that cycle length?' }], answer: (p) => p.misere ? 1 : 0, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: p.misere ? 'A pile of one loses because taking the last object loses. The losing class is 1 modulo the cycle.' : 'An empty pile loses for the player to move. Positive multiples of the cycle are also losing.' }] },
    { prompt: () => [{ t: 'p', text: 'What winning first move reaches the losing class, or −1 if you already occupy it?' }], answer: winningMove, tolerance: { abs: 0 }, explain: (p) => [{ t: 'p', text: `The result is ${winningMove(p)}. A winning move leaves the opponent in the losing remainder class.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Work backwards from ${p.misere ? 'one object, where the next player must take the last and lose' : 'zero objects, where the next player cannot move'}. Losing positive piles are ${p.misere ? '1' : '0'} modulo ${p.maximum + 1}. From any other residue remove the difference to reach that class; then answer every move x with ${p.maximum + 1} − x. Here the winning first move is ${winningMove(p)}${winningMove(p) === -1 ? ', meaning no first move forces a win' : ''}.` }],
}
