import type { Block, Rng, Step, Template } from '../types.ts'
import { display, exact } from './common.ts'
import { permutations } from '../logic/helpers.ts'

const review = { author: 'GPT-6', reviewer: null, reviewedAt: null }
const foundationLevels = [1, 2, 3, 4, 5, 6].map(level => ({ level, initialRating: 200 + 200 * level }))
const advancedLevels = [1, 2, 3, 4].map(level => ({ level, initialRating: 1500 + 300 * level }))
const ids = 'abcdef'.split('')
const text = (value: string): Block[] => [{ t: 'p', text: value }]
function shuffled<T>(rng: Rng, values: readonly T[]): T[] {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i--) { const j = rng.int(0, i); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy
}
function step<P>(prompt: (p: P) => string, answer: (p: P) => number, explain: (p: P) => string): Step<P> {
  return { prompt: p => text(prompt(p)), answer, tolerance: exact, explain: p => text(explain(p)) }
}

type Measurement = { level: number; a: number; b: number; c: number; scale: number }
function measurement(p: Measurement): number {
  if (p.level === 1) return 2 * (p.a + p.b)
  if (p.level === 2) return p.a * p.b / 2
  if (p.level === 3) return 180 - p.a - p.b
  if (p.level === 4) return p.a * p.scale ** 2
  if (p.level === 5) return (p.a + 2 * p.c) * (p.b + 2 * p.c) - p.a * p.b
  return 2 * (p.a * p.b + p.b * p.c + p.c * p.a)
}
export const measurementFoundation: Template<Measurement> = {
  id: 'math.geometry.foundation.measurement', version: 1, track: 'math', concept: 'math.geometry', family: 'geometric-measurement-foundations',
  status: 'draft', review, levels: foundationLevels, skins: ['workshop', 'drawing'], dailyLevels: [6],
  sample: (rng, level) => ({ level, a: level === 3 ? rng.int(20, 70) : rng.int(3, 40), b: level === 3 ? rng.int(20, 70) : rng.int(3, 40), c: rng.int(1, 12), scale: rng.int(2, 8) }),
  solve: measurement,
  verify(p) {
    if (p.level === 1) return p.a + p.b + p.a + p.b
    if (p.level === 2) return Math.abs(p.a * p.b - 0) / 2
    if (p.level === 3) { let missing = 0; while (p.a + p.b + missing < 180) missing++; return missing }
    if (p.level === 4) { let result = 0; for (let i = 0; i < p.scale ** 2; i++) result += p.a; return result }
    if (p.level === 5) return 2 * p.c * p.a + 2 * p.c * p.b + 4 * p.c ** 2
    const faces = [[p.a, p.b], [p.a, p.c], [p.b, p.c]]
    return faces.reduce((area, [a, b]) => area + a * b + a * b, 0)
  },
  render(p, skin) {
    const blocks = text(`A ${skin === 'workshop' ? 'workshop measurement exercise' : 'geometric drawing exercise'} uses exact givens. Any diagram is schematic and not to scale; only labelled measurements may be used.`)
    if (p.level === 1) {
      blocks.push({ t: 'diagram', title: 'Rectangle boundary', description: 'Four right angles. Opposite sides are equal. The diagram is not to scale.', points: [{ label: 'A', x: 65, y: 55 }, { label: 'B', x: 335, y: 55 }, { label: 'C', x: 335, y: 210 }, { label: 'D', x: 65, y: 210 }], segments: [{ from: 0, to: 1, label: `${p.a} cm` }, { from: 1, to: 2, label: `${p.b} cm` }, { from: 2, to: 3 }, { from: 3, to: 0 }] })
      blocks.push({ t: 'p', text: 'What is the complete perimeter of the rectangle, in centimetres?' })
    } else if (p.level === 2 || p.level === 3) {
      blocks.push({ t: 'diagram', title: p.level === 2 ? 'Triangle with perpendicular base and height' : 'Triangle angles', description: p.level === 2 ? 'AB is the base and AC is perpendicular to AB. Not to scale.' : 'ABC is a nondegenerate triangle. No equality of sides or angles is implied. Not to scale.', points: [{ label: p.level === 3 ? `A: ${p.a}°` : 'A', x: 65, y: 210 }, { label: p.level === 3 ? `B: ${p.b}°` : 'B', x: 335, y: 210 }, { label: 'C', x: p.level === 2 ? 65 : 175, y: 40 }], segments: [{ from: 0, to: 1, ...(p.level === 2 ? { label: `${p.a} cm` } : {}) }, { from: 0, to: 2, ...(p.level === 2 ? { label: `${p.b} cm` } : {}) }, { from: 1, to: 2 }] })
      blocks.push({ t: 'p', text: p.level === 2 ? 'What is the triangle’s area in square centimetres?' : 'What is the third interior angle, at C, in degrees?' })
    } else blocks.push({ t: 'p', text: p.level === 4 ? `Two triangles are similar. The smaller area is ${p.a} cm²; each corresponding length in the larger triangle is ${p.scale} times its smaller length. What is the larger area, in cm²?`
      : p.level === 5 ? `A rectangular opening measures ${p.a} cm by ${p.b} cm. A uniform frame of width ${p.c} cm surrounds all four sides outside the opening. What is the frame’s area, excluding the opening, in cm²?`
      : `A closed rectangular box has edge lengths ${p.a}, ${p.b} and ${p.c} centimetres. All six faces are included. What is its total surface area, in cm²?` })
    return blocks
  },
  answer: p => ({ type: 'number', unit: p.level === 1 ? 'cm' : p.level === 3 ? 'degrees' : 'cm²', tolerance: exact }),
  misconceptions: [
    { id: 'omit-opposite-face-or-second-dimension', value: p => p.level === 1 ? p.a + p.b : p.level === 2 ? p.a * p.b : p.level === 3 ? 180 - p.a : p.level === 4 ? p.a * p.scale : p.level === 5 ? 2 * p.c * (p.a + p.b) : p.a * p.b + p.b * p.c + p.c * p.a, feedback: () => 'Count every required side or face, and distinguish a length scale from an area scale. A frame also includes the corner regions.' },
    { id: 'use-lengths-instead-of-area-or-angle-sum', value: p => p.level === 1 ? p.a * p.b : p.level === 2 || p.level === 3 ? p.a + p.b : p.level === 4 ? p.a + p.scale : p.level === 5 ? (p.a + p.c) * (p.b + p.c) - p.a * p.b : p.a + p.b + p.c, feedback: () => 'Match the operation to the geometric quantity. Triangle angles sum to 180°, while areas use two dimensions and a uniform border adds width on both opposite sides.' },
  ],
  steps: [
    step(p => p.level === 1 ? 'What is the length of side AB in centimetres?' : p.level === 2 ? 'What is base times perpendicular height, in square centimetres?' : p.level === 3 ? 'What is the sum of the two known angles?' : p.level === 4 ? 'What is the large-to-small length scale factor?' : p.level === 5 ? 'What is the outer frame width, including both borders?' : 'What is the area of one face with edges a and b?', p => p.level === 1 ? p.a : p.level === 2 ? p.a * p.b : p.level === 3 ? p.a + p.b : p.level === 4 ? p.scale : p.level === 5 ? p.a + 2 * p.c : p.a * p.b, () => 'Identify a given side, a rectangle containing the triangle, or one component area before combining parts.'),
    step(p => p.level === 1 ? 'What is the sum of one width and one height?' : p.level === 2 ? 'By what number is base times height divided for a triangle?' : p.level === 3 ? 'What is the sum of all three interior triangle angles?' : p.level === 4 ? 'What is the large-to-small area scale factor?' : p.level === 5 ? 'What is the outer rectangle area, including the opening?' : 'What is the sum of the three distinct face areas?', p => p.level === 1 ? p.a + p.b : p.level === 2 ? 2 : p.level === 3 ? 180 : p.level === 4 ? p.scale ** 2 : p.level === 5 ? (p.a + 2 * p.c) * (p.b + 2 * p.c) : p.a * p.b + p.b * p.c + p.c * p.a, () => 'Count the required parts or apply the correct area factor before the final total or subtraction.'),
    step(() => 'What is the requested final measurement?', measurement, p => `Apply the correct perimeter, area, angle or face-count relation: ${display(measurement(p))}.`),
  ],
  solution: p => text(p.level === 1 ? `Both pairs of opposite sides count: perimeter = 2(${p.a}+${p.b}) = ${measurement(p)} cm.` : p.level === 2 ? `Two congruent right triangles form a ${p.a} by ${p.b} rectangle. One triangle has half its area: ${measurement(p)} cm².` : p.level === 3 ? `Interior angles sum to 180°. The remaining angle is 180−${p.a}−${p.b}=${measurement(p)}°.` : p.level === 4 ? `Both base and height scale by ${p.scale}, so area scales by ${p.scale ** 2}. The larger area is ${measurement(p)} cm².` : p.level === 5 ? `Outer dimensions are ${p.a}+2×${p.c} and ${p.b}+2×${p.c}. Subtract the opening area: (${p.a}+2×${p.c})(${p.b}+2×${p.c})−${p.a}×${p.b}=${measurement(p)} cm². This includes all four corners.` : `There are two faces of each area ${p.a * p.b}, ${p.a * p.c}, and ${p.b * p.c}. Their sum is ${measurement(p)} cm².`),
}

type CirclePower = { level: number; a: number; b: number; c: number; d: number }
function powerAnswer(p: CirclePower): number {
  if (p.level === 1) return p.a * p.b / p.c
  if (p.level === 2) return Math.sqrt(p.a * (p.a + p.b))
  if (p.level === 3) return (Math.sqrt(p.a ** 2 + 4 * p.c * (p.c + p.d)) - p.a) / 2
  return 2 * Math.sqrt(p.a * p.b)
}
function circleDiagram(p: CirclePower): Block {
  if (p.level === 1 || p.level === 4) return { t: 'diagram', title: 'Two chords through interior point P', description: 'A,P,B are collinear; C,P,D are collinear; A,B,C,D lie on the same circle. The second chord may change direction in the extremal question. Schematic, not to scale.', points: [{ label: 'A', x: 120, y: 130 }, { label: 'B', x: 320, y: 130 }, { label: 'C', x: 140, y: 70 }, { label: 'D', x: 280, y: 210 }, { label: 'P', x: 200, y: 130 }], segments: [{ from: 0, to: 4, label: `AP=${p.a}` }, { from: 4, to: 1, label: `PB=${p.b}` }, { from: 4, to: 2, ...(p.level === 1 ? { label: `CP=${p.c}` } : {}) }, { from: 4, to: 3, ...(p.level === 1 ? { label: 'PD=x' } : {}) }], circles: [{ x: 220, y: 130, r: 100 }] }
  if (p.level === 2) return { t: 'diagram', title: 'Tangent and secant from exterior point P', description: 'P,A,B are collinear in that order; PT is tangent at T. Schematic, not to scale.', points: [{ label: 'P', x: 60, y: 130 }, { label: 'A', x: 140, y: 130 }, { label: 'B', x: 340, y: 130 }, { label: 'T', x: 240 - 10000 / 180, y: 130 - 100 * Math.sqrt(22400) / 180 }], segments: [{ from: 0, to: 1, label: `PA=${p.a}` }, { from: 1, to: 2, label: `AB=${p.b}` }, { from: 3, to: 0, label: 'PT=x' }], circles: [{ x: 240, y: 130, r: 100 }] }
  return { t: 'diagram', title: 'Two secants from exterior point P', description: 'P,A,B are collinear in that order; P,C,D are collinear in that order. A,B,C,D lie on one circle. Schematic, not to scale.', points: [{ label: 'P', x: 60, y: 130 }, { label: 'A', x: 140, y: 130 }, { label: 'B', x: 340, y: 130 }, { label: 'C', x: 144, y: 158 }, { label: 'D', x: 300, y: 210 }], segments: [{ from: 0, to: 1, label: 'PA=x' }, { from: 1, to: 2, label: `AB=${p.a}` }, { from: 3, to: 0, label: `PC=${p.c}` }, { from: 3, to: 4, label: `CD=${p.d}` }], circles: [{ x: 240, y: 130, r: 100 }] }
}
export const circlePowerAdvanced: Template<CirclePower> = {
  id: 'math.geometry.advanced.circle-power', version: 1, track: 'math', concept: 'math.geometry', family: 'circle-power-and-chord-extrema',
  status: 'draft', review, levels: advancedLevels, skins: ['geometry', 'construction'],
  sample(rng, level) {
    if (level === 3) { const c = rng.int(2, 60), multiplier = rng.int(2, 18), a = rng.int(2, 180); return { level, a, b: 0, c, d: c * (multiplier ** 2 - 1) + multiplier * a } }
    return { level, a: rng.int(5, level === 4 ? 900 : 400), b: rng.int(5, level === 4 ? 900 : 400), c: level === 1 ? rng.int(5, 400) : 0, d: 0 }
  },
  solve: powerAnswer,
  verify(p) {
    if (p.level === 1) { const centreY = (p.c ** 2 - p.a * p.b) / (2 * p.c); return Math.sqrt(centreY ** 2 + p.a * p.b) - centreY }
    if (p.level === 2) { const centreDistance = p.a + p.b / 2, radius = p.b / 2; return Math.sqrt(centreDistance ** 2 - radius ** 2) }
    if (p.level === 4) { const radius = (p.a + p.b) / 2, centreDistance = Math.abs(p.a - p.b) / 2; return 2 * Math.sqrt(radius ** 2 - centreDistance ** 2) }
    let low = 0, high = p.c + p.d + p.a
    for (let i = 0; i < 70; i++) { const mid = (low + high) / 2; if (mid * (mid + p.a) < p.c * (p.c + p.d)) low = mid; else high = mid }
    return (low + high) / 2
  },
  render(p, skin) {
    const blocks = text(`An original ${skin === 'geometry' ? 'circle-geometry problem' : 'geometric construction problem'} uses positive lengths in centimetres. The schematic fixes incidences only and is not to scale. Do not measure the drawing.`)
    blocks.push(circleDiagram(p))
    blocks.push({ t: 'p', text: p.level === 1 ? `Chords AB and CD intersect inside the circle at P. AP=${p.a}, PB=${p.b}, CP=${p.c}. Find PD.` : p.level === 2 ? `P is outside the circle. The secant meets A then B, with PA=${p.a} and AB=${p.b}. PT is a tangent. Find PT.` : p.level === 3 ? `P is outside the circle. One secant meets A then B, with AB=${p.a}. Another meets C then D, with PC=${p.c} and CD=${p.d}. Find the exterior length PA, not the full length PB.` : `A fixed chord AB passes through a fixed interior point P, with AP=${p.a} and PB=${p.b}. Among all chords CD through P in this same circle, what is the shortest possible total length CD? Give a numerical length; a proof or equality argument is supplied after resolution.` })
    return blocks
  },
  answer: () => ({ type: 'number', unit: 'cm', tolerance: { abs: 0.001 } }),
  misconceptions: [
    { id: 'add-chord-pieces-instead-of-products', value: p => p.level === 1 ? p.a + p.b - p.c : p.level === 2 ? p.a + p.b : p.level === 3 ? p.c + p.d - p.a : p.a + p.b, feedback: () => 'Circle power is a product relation. Interior chords satisfy AP·PB=CP·PD; exterior secants use exterior length times full length. A shortest chord needs a sharp bound, not the length of an arbitrary given chord.' },
    { id: 'ignore-whole-secant-or-square-root', value: p => p.level === 1 ? p.a * p.b : p.level === 2 ? Math.sqrt(p.a * p.b) : p.level === 3 ? p.c * p.d / p.a : p.a * p.b, feedback: () => 'Use the entire secant from the exterior point, not only the part inside the circle. A tangent relation or minimum-product bound produces a squared length before the square root.' },
  ],
  steps: [
    step(p => p.level === 3 ? 'What is the known full secant length PD?' : p.level === 2 ? 'What is the full secant length PB?' : 'What is the product AP·PB?', p => p.level === 3 ? p.c + p.d : p.level === 2 ? p.a + p.b : p.a * p.b, () => 'Keep exterior, interior and whole-secant lengths distinct.'),
    step(p => p.level === 3 ? 'What is the known power PC·PD?' : p.level === 2 ? 'What is the squared tangent length PT²?' : p.level === 4 ? 'What is the lower bound for CD²?' : 'What is CP?', p => p.level === 3 ? p.c * (p.c + p.d) : p.level === 2 ? p.a * (p.a + p.b) : p.level === 4 ? 4 * p.a * p.b : p.c, () => 'Use equal chord products or exterior power. For a sum of two positive segments, (u+v)²≥4uv.'),
    step(() => 'What is the requested positive length?', powerAnswer, p => `Resolve the product or quadratic and enforce positivity and the relevant equality case: ${display(powerAnswer(p))} cm.`),
  ],
  solution: p => text(p.level === 1 ? `Intersecting chords give ${p.a}×${p.b}=${p.c}×PD, hence PD=${display(powerAnswer(p))} cm.` : p.level === 2 ? `PB=PA+AB=${p.a + p.b}. Tangent–secant power gives PT²=PA·PB=${p.a * (p.a + p.b)}, so PT=${display(powerAnswer(p))} cm.` : p.level === 3 ? `Let PA=x>0. The whole secant is PB=x+${p.a}, while PD=${p.c + p.d}. Equal exterior powers give x(x+${p.a})=${p.c}(${p.c + p.d}). The positive root is ${display(powerAnswer(p))} cm. The negative root cannot be a length.` : `Every chord through P has CP·PD=AP·PB=${p.a * p.b}. Thus CD=CP+PD≥2√(CP·PD)=${display(powerAnswer(p))} cm. Equality requires CP=PD. It is achievable by the chord through P perpendicular to OP, where O is the circle centre; if P=O, every chord is a diameter. Therefore the bound is an attained minimum.`),
}

type Transformations = { level: number; matrices: number[][]; order: string[] }
function invariant(p: Transformations, matrix: number[]): boolean {
  const [a, b, c, d] = matrix, first = a * a + c * c, second = b * b + d * d, dot = a * b + c * d, determinant = a * d - b * c
  if (p.level === 1) return first === 1 && second === 1 && dot === 0
  if (p.level === 2) return Math.abs(determinant) === 1
  return first > 0 && first === second && dot === 0 && determinant > 0
}
function transformAnswer(p: Transformations): string[] { return ids.filter((_, i) => invariant(p, p.matrices[i])) }
export const transformationAudit: Template<Transformations> = {
  id: 'math.geometry.variety.transformation-invariants', version: 1, track: 'math', concept: 'math.geometry', family: 'linear-transformation-invariant-audit',
  status: 'draft', review, levels: [1, 2, 3].map(level => ({ level, initialRating: 500 + 500 * level })), skins: ['designs', 'maps'], dailyLevels: [2],
  sample(rng, level) {
    const pool = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [1, 0, 0, -1], [0, 1, 1, 0]]
    const matrices = ids.map(() => { const k = rng.int(2, 6); return [...rng.pick([...pool, [k, 0, 0, k], [k, 0, 0, 1], [1, k, 0, 1], [k, 1, 1, 0], [1, 0, 0, 0]])] })
    return { level, matrices, order: shuffled(rng, ids) }
  },
  solve: transformAnswer,
  verify(p) {
    return ids.filter((_, i) => {
      const [a, b, c, d] = p.matrices[i]
      const lengthX = Math.hypot(a, c), lengthY = Math.hypot(b, d), diagonal = Math.hypot(a + b, c + d)
      const orientedDoubleArea = a * d + 0 + 0 - b * c - 0 - 0
      if (p.level === 2) return Math.abs(orientedDoubleArea) === 1
      const equalAxisScale = lengthX > 0 && Math.abs(lengthX - lengthY) < 1e-10
      const rightAngleAndBisector = Math.abs(diagonal ** 2 - 2 * lengthX ** 2) < 1e-10
      return p.level === 1 ? equalAxisScale && rightAngleAndBisector && Math.abs(lengthX - 1) < 1e-10 : equalAxisScale && rightAngleAndBisector && orientedDoubleArea > 0
    })
  },
  render(p, skin) {
    return [...text(`Six proposed planar transformations act on ${skin === 'designs' ? 'designs' : 'maps'}. A row [a,b;c,d] means (x,y) maps to (ax+by,cx+dy), with no translation. The question concerns every possible input figure, not just one displayed example.`), { t: 'table', head: ['Transformation', 'a', 'b', 'c', 'd'], rows: p.order.map(id => [id.toUpperCase(), ...p.matrices[ids.indexOf(id)].map(String)]) }, ...text(p.level === 1 ? 'Select all transformations that preserve every Euclidean distance exactly.' : p.level === 2 ? 'Select all transformations that preserve the unsigned area of every figure exactly. Reflections are allowed if area magnitude is preserved.' : 'Select all transformations that preserve every angle and also preserve orientation. Uniform changes in scale are allowed; collapsing a plane to a line is not.')]
  },
  answer: p => ({ type: 'multi', options: p.order.map(id => ({ id, label: `Transformation ${id.toUpperCase()}` })) }),
  misconceptions: [
    { id: 'determinant-alone-implies-all-invariants', value: p => ids.filter((_, i) => { const [a, b, c, d] = p.matrices[i]; return a * d - b * c === 1 }), feedback: () => 'Determinant controls oriented area, not all distances or angles. A shear can preserve area while changing shapes; an orientation-reversing isometry can preserve distances.' },
    { id: 'all-linear-maps-preserve-shape', value: () => [...ids], feedback: () => 'Linearity preserves straight lines through the origin, but does not by itself preserve length, area or angles. Check the requested metric invariant and nondegeneracy.' },
    { id: 'only-identity-is-safe', value: p => ids.filter((_, i) => p.matrices[i].every((value, j) => value === [1, 0, 0, 1][j])), feedback: () => 'Nontrivial rotations, reflections or uniform scalings may preserve the requested quantity. Identify the invariant rather than requiring every coordinate to stay fixed.' },
  ],
  steps: [
    step(() => 'What is the determinant of Transformation A?', p => { const [a, b, c, d] = p.matrices[0]; return a * d - b * c }, () => 'The determinant gives the signed area scale. Its magnitude gives the unsigned area scale.'),
    step(() => 'What is the dot product of the two transformed coordinate basis vectors for A?', p => { const [a, b, c, d] = p.matrices[0]; return a * b + c * d }, () => 'Zero dot product means the transformed coordinate axes remain perpendicular. Equal column lengths additionally give a uniform scale.'),
    step(() => 'How many transformations satisfy the full requested invariant?', p => transformAnswer(p).length, p => `Check every condition, including orientation when required. ${transformAnswer(p).length} transformations qualify.`),
  ],
  solution(p) { const selected = transformAnswer(p); return text(`Select ${selected.length ? selected.map(id => `Transformation ${id.toUpperCase()}`).join(', ') : 'no transformations'}. For columns u=(a,c) and v=(b,d), distance preservation requires |u|²=|v|²=1 and u·v=0. Area preservation requires |ad−bc|=1. Orientation-preserving angle similarity requires equal positive column squared lengths, zero dot product and positive determinant. Apply only the condition named in this question; these three properties are not interchangeable.`) },
}

type MeetingPoint = { id: string; x: number }
type Reflection = { level: number; ax: number; ay: number; bx: number; by: number; low: number; high: number; candidates: MeetingPoint[] }
function bestMeetingX(p: Reflection): number {
  const crossing = (p.ax * p.by + p.bx * p.ay) / (p.ay + p.by)
  return p.level === 3 ? Math.max(p.low, Math.min(p.high, crossing)) : crossing
}
function routeLength(p: Reflection, x: number): number { return Math.hypot(x - p.ax, p.ay) + Math.hypot(x - p.bx, p.by) }
function routeAnswer(p: Reflection): string { const x = bestMeetingX(p); return p.candidates.find(point => Math.abs(point.x - x) < 1e-9)!.id }
export const reflectionRoute: Template<Reflection> = {
  id: 'math.geometry.variety.reflection-route', version: 1, track: 'math', concept: 'math.geometry', family: 'reflection-boundary-route-choice',
  status: 'draft', review, levels: [1, 2, 3].map(level => ({ level, initialRating: 600 + 600 * level })), skins: ['light', 'routes'], dailyLevels: [1],
  sample(rng, level) {
    const ay = rng.int(2, 12), by = level === 1 ? ay : rng.int(2, 12), ax = rng.int(5, 50), bx = ax + (ay + by) * rng.int(2, 6)
    const crossing = (ax * by + bx * ay) / (ay + by)
    const kind = level === 3 ? rng.int(0, 2) : 0
    const low = kind === 1 ? crossing + rng.int(1, 10) : Math.max(0, crossing - rng.int(10, 30))
    const high = kind === 2 ? crossing - rng.int(1, 5) : Math.max(low + 10, crossing + rng.int(10, 30))
    const actualLow = Math.min(low, high - 10)
    const p: Reflection = { level, ax, ay, bx, by, low: actualLow, high, candidates: [] }
    const correct = bestMeetingX(p), values = new Set<number>([correct])
    const rangeLow = level === 3 ? actualLow : Math.max(0, ax - 10), rangeHigh = level === 3 ? high : bx + 10
    if (ax >= rangeLow && ax <= rangeHigh) values.add(ax)
    if (bx >= rangeLow && bx <= rangeHigh) values.add(bx)
    while (values.size < 6) values.add(rng.int(rangeLow, rangeHigh))
    const labels = shuffled(rng, ids)
    p.candidates = shuffled(rng, [...values].slice(0, 6).map((x, i) => ({ id: labels[i], x })))
    return p
  },
  solve: routeAnswer,
  verify(p) {
    let best = '', distance = Infinity
    for (const candidate of p.candidates) {
      if (p.level === 3 && (candidate.x < p.low || candidate.x > p.high)) continue
      const length = Math.sqrt((candidate.x - p.ax) ** 2 + p.ay ** 2) + Math.sqrt((candidate.x - p.bx) ** 2 + p.by ** 2)
      if (length < distance) { distance = length; best = candidate.id }
    }
    return best
  },
  render(p, skin) {
    return [...text(`An idealized ${skin === 'light' ? 'light path' : 'walking route'} goes from S=(${p.ax},${p.ay}) to a point P=(x,0) on a straight boundary, then to T=(${p.bx},${p.by}). Both legs are straight, all distances use the same units, and total length is SP+PT. There is no obstacle or speed weighting. The coordinates below are exact; the drawing is not to scale.`),
      { t: 'diagram', title: 'A route touching a straight boundary', description: `S and T lie on the same side of the boundary y=0. P is a variable meeting point. ${p.level === 3 ? `P must have ${p.low}≤x≤${p.high}. ` : ''}Schematic, not to scale; P's drawn position is not a proposed answer.`, points: [{ label: `S=(${p.ax},${p.ay})`, x: 75, y: 55 }, { label: `T=(${p.bx},${p.by})`, x: 325, y: 75 }, { label: 'P=(x,0)', x: 190, y: 215 }, { label: 'Boundary left', x: 30, y: 215 }, { label: 'Boundary right', x: 370, y: 215 }], segments: [{ from: 0, to: 2 }, { from: 2, to: 1 }, { from: 3, to: 4, label: p.level === 3 ? `Allowed x: ${p.low} to ${p.high}` : 'y=0' }] },
      ...text(`${p.level === 3 ? `The meeting point must also lie in the closed gate ${p.low}≤x≤${p.high}. ` : ''}Choose the listed meeting point that gives the smallest total route length. Exactly one listed point is optimal; all listed points are feasible.`)]
  },
  answer: p => ({ type: 'choice', options: p.candidates.map(candidate => ({ id: candidate.id, label: `Point ${candidate.id.toUpperCase()}: P=(${candidate.x},0)` })) }),
  misconceptions: [
    { id: 'midpoint-of-horizontal-coordinates', value: p => [...p.candidates].sort((a, b) => Math.abs(a.x - (p.ax + p.bx) / 2) - Math.abs(b.x - (p.ax + p.bx) / 2))[0].id, feedback: () => 'The midpoint of the two horizontal coordinates is optimal only in special symmetric cases. Reflect one endpoint across the boundary and use the straight-line crossing; then enforce any gate.' },
    { id: 'minimize-only-first-leg', value: p => [...p.candidates].sort((a, b) => Math.abs(a.x - p.ax) - Math.abs(b.x - p.ax))[0].id, feedback: () => 'A point closest to S can make the second leg longer. Minimize the complete sum SP+PT, with the boundary constraint included.' },
    { id: 'maximize-instead-of-minimize-route', value: p => [...p.candidates].sort((a, b) => routeLength(p, b.x) - routeLength(p, a.x))[0].id, feedback: () => 'The requested route is shortest, not longest. Reflection gives a lower bound, and a restricted gate can force an endpoint.' },
  ],
  steps: [
    step(() => 'What is the y-coordinate of the reflection of S across y=0?', p => -p.ay, () => 'Reflection across the boundary preserves distance from every boundary point.'),
    step(() => 'What x-coordinate does the straight line from reflected S to T have when y=0?', p => (p.ax * p.by + p.bx * p.ay) / (p.ay + p.by), () => 'Use linear interpolation with the two positive heights, rather than an unweighted midpoint.'),
    step(() => 'What is the feasible optimal meeting x-coordinate?', bestMeetingX, p => `The optimal x is ${display(bestMeetingX(p))}${p.level === 3 ? ' after clipping the reflected crossing to the allowed interval' : ''}.`),
  ],
  solution(p) { const id = routeAnswer(p), crossing = (p.ax * p.by + p.bx * p.ay) / (p.ay + p.by); return text(`Choose Point ${id.toUpperCase()}, with P=(${display(bestMeetingX(p))},0). Reflect S across y=0. For any boundary point, SP equals the distance from reflected S to P; the triangle inequality bounds SP+PT below by the straight segment from reflected S to T. Its crossing is x=${display(crossing)}. ${p.level === 3 ? 'The length sum is strictly convex in x and decreases up to this crossing then increases. If the crossing lies outside the gate, the nearer gate endpoint is the constrained minimizer.' : 'The crossing attains the straight-line bound.'} This argument optimizes the full two-leg route, not either leg alone.`) },
}

type ExtremaBasic = { level: number; sum: number; fee: number; low: number; high: number; weight: number; coefficient: number }
function basicOptimumX(p: ExtremaBasic): number {
  const vertex = p.sum / 2
  if (p.level === 4 || p.level === 5) return Math.max(p.low, Math.min(p.high, vertex))
  return vertex
}
function basicExtremum(p: ExtremaBasic): number {
  if (p.level === 1) return Math.floor(p.sum / 2) * Math.ceil(p.sum / 2)
  if (p.level === 2) return p.sum ** 2 / 2
  if (p.level === 3) return p.sum ** 2 / 4 - p.fee
  if (p.level === 4) { const x = basicOptimumX(p); return x * (p.sum - x) }
  if (p.level === 5) { const v = basicOptimumX(p); return Math.max(Math.floor(v) * (p.sum - Math.floor(v)), Math.ceil(v) * (p.sum - Math.ceil(v))) }
  return 2 * Math.sqrt(p.weight * p.coefficient)
}
export const extremaFoundation: Template<ExtremaBasic> = {
  id: 'math.optimization.foundation.extrema', version: 1, track: 'math', concept: 'math.optimization', family: 'extrema-foundation-domains',
  status: 'draft', review, levels: foundationLevels, skins: ['numbers', 'design'], dailyLevels: [6],
  sample(rng, level) {
    const sum = rng.int(10, 80), low = rng.int(1, sum - 2), high = rng.int(low + 1, sum - 1), weight = rng.int(2, 20), root = rng.int(2, 25)
    return { level, sum, fee: rng.int(1, 50), low, high, weight, coefficient: weight * root ** 2 }
  },
  solve: basicExtremum,
  verify(p) {
    if (p.level === 1 || p.level === 5) {
      let best = -Infinity
      for (let x = p.level === 1 ? 1 : p.low; x <= (p.level === 1 ? p.sum - 1 : p.high); x++) best = Math.max(best, x * (p.sum - x))
      return best
    }
    if (p.level === 2) { const mean = p.sum / 2; return mean ** 2 + (p.sum - mean) ** 2 }
    if (p.level === 6) {
      let low = 0.000001, high = p.coefficient + p.weight
      for (let i = 0; i < 80; i++) { const x = (low + high) / 2; if (p.weight - p.coefficient / x ** 2 < 0) low = x; else high = x }
      const x = (low + high) / 2
      return p.weight * x + p.coefficient / x
    }
    let best = -Infinity
    for (const x of p.level === 4 ? [p.low, p.high, ...(p.sum / 2 >= p.low && p.sum / 2 <= p.high ? [p.sum / 2] : [])] : [p.sum / 2]) best = Math.max(best, x * p.sum - x * x - (p.level === 3 ? p.fee : 0))
    return best
  },
  render: (p, skin) => text(`An exact ${skin === 'numbers' ? 'number optimization' : 'design-score optimization'} problem asks for an attained extremum, with the domain stated explicitly. ${p.level === 1 ? `Positive integers x and y satisfy x+y=${p.sum}. What is the maximum product xy?` : p.level === 2 ? `Real numbers x and y satisfy x+y=${p.sum}. What is the minimum x²+y²?` : p.level === 3 ? `A real variable satisfies 0≤x≤${p.sum}. The score is x(${p.sum}−x)−${p.fee}. What is its maximum value?` : p.level === 4 ? `A real variable satisfies ${p.low}≤x≤${p.high}. What is the maximum x(${p.sum}−x)?` : p.level === 5 ? `An integer variable satisfies ${p.low}≤x≤${p.high}. What is the maximum x(${p.sum}−x)?` : `For a positive real x, what is the minimum value of ${p.weight}x+${p.coefficient}/x?`}`),
  answer: () => ({ type: 'number', tolerance: exact }),
  misconceptions: [
    { id: 'ignore-domain-and-attainability', value: p => p.level === 1 ? p.sum ** 2 / 4 : p.level === 2 ? p.sum ** 2 : p.level === 3 ? p.sum ** 2 / 4 : p.level <= 5 ? p.sum ** 2 / 4 : p.weight + p.coefficient, feedback: () => 'An unconstrained or continuous bound may be unavailable in the stated domain. Check integrality, interval endpoints, constant costs and the equality condition.' },
    { id: 'extreme-input-always-best', value: p => p.level === 1 ? p.sum - 1 : p.level === 2 ? 0 : p.level === 3 ? -p.fee : p.level <= 5 ? Math.min(p.low * (p.sum - p.low), p.high * (p.sum - p.high)) : p.weight * p.coefficient, feedback: () => 'An extreme output can occur at an interior balance rather than an extreme input. Complete a square or apply the appropriate inequality, and then enforce feasibility.' },
    { id: 'sum-is-the-product-bound', value: p => p.level === 6 ? p.weight + Math.sqrt(p.coefficient) : p.sum, feedback: () => 'The fixed sum is a constraint, not generally the optimal objective value. Substitute an attainable optimizer into the expression being optimized.' },
  ],
  steps: [
    step(p => p.level === 6 ? 'What is the product of the two positive terms whose sum is being minimized?' : 'What is the continuous balance point x for the fixed-sum quadratic?', p => p.level === 6 ? p.weight * p.coefficient : p.sum / 2, () => 'Find the equality or balance condition before applying domain restrictions.'),
    step(p => p.level === 6 ? 'At equality, what positive x makes the two terms equal?' : p.level === 4 || p.level === 5 ? 'What is the continuous balance point after restriction to the interval?' : p.level === 1 ? 'What is the smaller integer in the closest feasible pair?' : 'What is the square of the equal-share value?', p => p.level === 6 ? Math.sqrt(p.coefficient / p.weight) : p.level === 1 ? Math.floor(p.sum / 2) : p.level === 2 || p.level === 3 ? (p.sum / 2) ** 2 : basicOptimumX(p), () => 'An integer domain may require neighboring integers; a bounded interval may force an endpoint. Squaring the balance supplies the quadratic objective value.'),
    step(() => 'What is the attained optimal value of the requested expression?', basicExtremum, p => `Evaluate the actual objective at a feasible equality point or best neighboring integer: ${display(basicExtremum(p))}.`),
  ],
  solution: p => text(p.level === 6 ? `AM–GM gives ${p.weight}x+${p.coefficient}/x≥2√(${p.weight * p.coefficient})=${display(basicExtremum(p))}, attained when x=√(${p.coefficient}/${p.weight}).` : `Use xy=[(x+y)²−(x−y)²]/4 or x²+y²=[(x+y)²+(x−y)²]/2. Balance minimizes the nonnegative square. ${p.level === 1 ? 'Choose the two positive integers closest to half the sum.' : p.level === 4 || p.level === 5 ? 'Project the balance point to the allowed interval, then compare feasible neighboring integers if needed.' : p.level === 3 ? 'The fixed score subtraction changes the optimal value, not the balance point.' : 'Equality at x=y is feasible in the real domain.'} The attained requested value is ${display(basicExtremum(p))}.`),
}

function balanced(sum: number, lower: number[]): number[] | null {
  if (sum < lower.reduce((a, b) => a + b, 0)) return null
  const tuple = [...lower]
  let remaining = sum - tuple.reduce((a, b) => a + b, 0)
  while (remaining > 0) { const smallest = tuple.indexOf(Math.min(...tuple)); tuple[smallest]++; remaining-- }
  return tuple
}
const product = (values: number[]): number => values.reduce((a, b) => a * b, 1)
type Constrained = { level: number; a: number; b: number; budget: number; capX: number; capY: number; sum: number; lower: number[]; lo: number; hi: number; modulus: number; residue: number }
function reciprocalX(p: Constrained): number { return Math.max(p.lo, Math.min(p.hi, p.sum * p.a / (p.a + p.b))) }
function firstLattice(p: Constrained): number { return p.lo + ((p.residue - p.lo) % p.modulus + p.modulus) % p.modulus }
function constrainedAnswer(p: Constrained): number {
  if (p.level === 1) {
    let best = 0
    for (let x = 1; x <= p.capX && p.a * x + p.b <= p.budget; x++) {
      const y = Math.min(p.capY, Math.floor((p.budget - p.a * x) / p.b))
      best = Math.max(best, x * y)
    }
    return best
  }
  if (p.level === 2) return product(balanced(p.sum, p.lower)!)
  if (p.level === 3) { const x = reciprocalX(p); return p.a ** 2 / x + p.b ** 2 / (p.sum - x) }
  const first = firstLattice(p), last = first + Math.floor((p.hi - first) / p.modulus) * p.modulus
  const crossing = p.b * p.sum / (p.a + p.b), index = Math.floor((crossing - first) / p.modulus)
  const candidates = [first, last, first + index * p.modulus, first + (index + 1) * p.modulus].map(x => Math.max(first, Math.min(last, x)))
  return Math.max(...candidates.map(x => Math.min(p.a * x, p.b * (p.sum - x))))
}
export const constrainedExtrema: Template<Constrained> = {
  id: 'math.optimization.advanced.constrained-extrema', version: 1, track: 'math', concept: 'math.optimization', family: 'integer-and-sharp-inequality-extrema',
  status: 'draft', review, levels: advancedLevels, skins: ['algebra', 'design'],
  sample(rng, level) {
    const a = rng.int(2, level === 3 ? 200 : 120), b = rng.int(2, level === 3 ? 200 : 120), lower = [rng.int(20, 80), rng.int(1, 20), rng.int(1, 20)]
    const sum = level === 2 ? lower.reduce((x, y) => x + y, 0) + rng.int(10, 80) : rng.int(50, 600)
    const lo = level === 4 ? rng.int(1, Math.floor(sum / 4)) : rng.int(1, sum - 2)
    const hi = level === 4 ? rng.int(Math.ceil(3 * sum / 4), sum - 1) : rng.int(lo + 1, sum - 1)
    const modulus = rng.int(2, 12)
    return { level, a, b, budget: a + b + rng.int(20, 600), capX: rng.int(5, 60), capY: rng.int(5, 60), sum, lower, lo, hi, modulus, residue: rng.int(0, modulus - 1) }
  },
  solve: constrainedAnswer,
  verify(p) {
    if (p.level === 1) {
      let maximum = 0
      for (let x = 1; x <= p.capX; x++) for (let y = 1; y <= p.capY; y++) if (p.a * x + p.b * y <= p.budget) maximum = Math.max(maximum, x * y)
      return maximum
    }
    if (p.level === 2) {
      let maximum = 0
      for (let x = p.lower[0]; x <= p.sum - p.lower[1] - p.lower[2]; x++) for (let y = p.lower[1]; y <= p.sum - x - p.lower[2]; y++) maximum = Math.max(maximum, x * y * (p.sum - x - y))
      return maximum
    }
    if (p.level === 4) {
      let maximum = -Infinity
      for (let x = p.lo; x <= p.hi; x++) if (x % p.modulus === p.residue) maximum = Math.max(maximum, Math.min(p.a * x, p.b * (p.sum - x)))
      return maximum
    }
    let low = p.lo, high = p.hi
    for (let i = 0; i < 80; i++) {
      const x = (low + high) / 2, derivative = -(p.a ** 2) / x ** 2 + p.b ** 2 / (p.sum - x) ** 2
      if (derivative < 0) low = x; else high = x
    }
    const x = (low + high) / 2
    return p.a ** 2 / x + p.b ** 2 / (p.sum - x)
  },
  render(p, skin) {
    return text(`An original ${skin === 'algebra' ? 'extremal algebra' : 'constrained design-score'} problem uses exactly the stated domains and constraints. ${p.level === 1 ? `Positive integers x and y obey ${p.a}x+${p.b}y≤${p.budget}, x≤${p.capX}, y≤${p.capY}. What is the maximum product xy? Unspent budget is allowed.` : p.level === 2 ? `Positive integers x,y,z obey x+y+z=${p.sum}, x≥${p.lower[0]}, y≥${p.lower[1]}, z≥${p.lower[2]}. What is the maximum product xyz? Lower bounds are coordinate-specific.` : p.level === 3 ? `A real x satisfies ${p.lo}≤x≤${p.hi}, and x+y=${p.sum}. What is the minimum of ${p.a}²/x+${p.b}²/y? Both denominators are positive. The interval restriction remains in force even if an unconstrained inequality has a familiar equality case.` : `An integer x satisfies ${p.lo}≤x≤${p.hi} and x≡${p.residue} (mod ${p.modulus}). Two bottlenecks have scores ${p.a}x and ${p.b}(${p.sum}−x). What is the maximum possible value of the smaller score? A congruence means x leaves the stated remainder when divided by the modulus.`}`)
  },
  answer: () => ({ type: 'number', tolerance: { abs: 0.001 } }),
  misconceptions: [
    { id: 'drop-active-constraints', value: p => p.level === 1 ? p.capX * p.capY : p.level === 2 ? product(balanced(p.sum, [1, 1, 1])!) : p.level === 3 ? (p.a + p.b) ** 2 / p.sum : p.a * p.b * p.sum / (p.a + p.b), feedback: () => 'A familiar unconstrained bound need not be attainable. Check budget, individual lower bounds, interval limits or congruence before declaring equality.' },
    { id: 'allocate-without-balancing-objective', value: p => p.level === 1 ? Math.floor(p.budget / p.a) * Math.floor(p.budget / p.b) : p.level === 2 ? p.lower[0] * (p.sum - p.lower[0] - p.lower[2]) * p.lower[2] : p.level === 3 ? 2 * (p.a ** 2 + p.b ** 2) / p.sum : Math.min(p.a * p.lo, p.b * (p.sum - p.lo)), feedback: () => 'The variables share one constraint. Balance the actual objective, not a symmetric-looking allocation, and compare neighboring feasible integer choices when necessary.' },
    { id: 'report-input-instead-of-objective', value: p => p.level === 1 ? p.budget : p.level === 2 ? p.sum : p.level === 3 ? (p.a + p.b) / p.sum : p.sum, feedback: () => 'The question asks for an optimal objective value. A budget, sum or equality-point coordinate is a different quantity.' },
  ],
  steps: [
    step(p => p.level === 1 ? 'What budget is required for x=y=1?' : p.level === 2 ? 'How many units remain after all three lower bounds are met?' : p.level === 3 ? 'What x would attain the unconstrained weighted reciprocal bound?' : 'What real x makes the two bottleneck scores equal?', p => p.level === 1 ? p.a + p.b : p.level === 2 ? p.sum - p.lower.reduce((a, b) => a + b, 0) : p.level === 3 ? p.sum * p.a / (p.a + p.b) : p.b * p.sum / (p.a + p.b), () => 'Locate feasibility or the equality point before imposing the remaining discrete or interval constraints.'),
    step(p => p.level === 1 ? 'At x=1, what is the largest feasible integer y?' : p.level === 2 ? 'What is the unconstrained equal-share value S/3?' : p.level === 3 ? 'What is the equality-point x after restriction to the interval?' : 'What is the smallest allowed x in the stated congruence class?', p => p.level === 1 ? Math.min(p.capY, Math.floor((p.budget - p.a) / p.b)) : p.level === 2 ? p.sum / 3 : p.level === 3 ? reciprocalX(p) : firstLattice(p), () => 'A coordinate-specific bound, rounding requirement or congruence can change which equality points are available.'),
    step(() => 'What is the attained requested extremal value?', constrainedAnswer, p => `Evaluate the best feasible configuration, rather than only the unconstrained bound: ${display(constrainedAnswer(p))}.`),
  ],
  solution: p => text(p.level === 1 ? `For each positive integer x up to ${p.capX}, the best y is min(${p.capY}, floor((${p.budget}−${p.a}x)/${p.b})), provided y≥1. Product increases with y for fixed positive x, so checking these rows covers every possible optimum. The largest product is ${constrainedAnswer(p)}.` : p.level === 2 ? `Start from the three lower bounds. Give each remaining unit to a currently smallest coordinate. If a larger coordinate could transfer one unit to a smaller coordinate without violating its lower bound, the product would increase whenever their gap exceeds one. This balancing rule yields ${balanced(p.sum, p.lower)!.join(', ')}, with product ${constrainedAnswer(p)}; permutations are usable only when they satisfy the coordinate-specific bounds.` : p.level === 3 ? `Cauchy–Schwarz gives a²/x+b²/y≥(a+b)²/(x+y), with equality x:y=a:b. The unconstrained x is ${display(p.sum * p.a / (p.a + p.b))}. This convex expression decreases up to that point and increases afterwards; restricting x to the interval gives x=${display(reciprocalX(p))}. Substitution yields ${display(constrainedAnswer(p))}.` : `The smaller of ax and b(S−x) increases up to the balance x=bS/(a+b), then decreases. Feasible x lie on a lattice spaced by ${p.modulus}; check its neighbors around the balance and its interval endpoints. The maximum smaller score is ${constrainedAnswer(p)}. A continuous balance alone is insufficient if it misses the congruence class.`),
}

type SharpBound = { level: number; sum: number; lower: number[]; order: string[] }
function optimalTuples(p: SharpBound): number[][] {
  const tuple = balanced(p.sum, p.lower)!
  const seen = new Set<string>()
  return permutations(tuple).filter(candidate => {
    const key = candidate.join(',')
    if (seen.has(key) || candidate.some((value, i) => value < p.lower[i])) return false
    seen.add(key)
    return true
  })
}
const sharpClaims = [
  'The AM–GM bound (S/n)^n is attained by a feasible integer tuple.',
  'Every maximizing tuple has largest coordinate minus smallest coordinate at most one.',
  'At least one maximizing tuple uses exactly the stated lower bound in the first coordinate.',
  'Every permutation of every maximizing tuple remains feasible and maximizing.',
  'Increasing only the first lower bound by one leaves a nonempty feasible set with the same maximum product.',
  'There is exactly one ordered maximizing tuple.',
]
function sharpTruth(p: SharpBound): boolean[] {
  const tuples = optimalTuples(p), representative = tuples[0], maximum = product(representative), n = p.lower.length
  const tightened = balanced(p.sum, p.lower.map((value, i) => value + Number(i === 0)))
  return [p.sum % n === 0 && p.lower.every(value => value <= p.sum / n), Math.max(...representative) - Math.min(...representative) <= 1, tuples.some(tuple => tuple[0] === p.lower[0]), Math.min(...representative) >= Math.max(...p.lower), tightened !== null && product(tightened) === maximum, tuples.length === 1]
}
function sharpAnswer(p: SharpBound): string[] { const truth = sharpTruth(p); return p.order.flatMap((claim, slot) => truth[ids.indexOf(claim)] ? [ids[slot]] : []) }
export const sharpBoundAudit: Template<SharpBound> = {
  id: 'math.optimization.variety.sharp-bound-audit', version: 1, track: 'math', concept: 'math.optimization', family: 'sharp-bounds-and-equality-audit',
  status: 'draft', review, levels: [1, 2, 3].map(level => ({ level, initialRating: 600 + 600 * level })), skins: ['numbers', 'allocations'], dailyLevels: [1],
  sample(rng, level) {
    const lower = level === 1 ? [1, 1] : level === 2 ? [1, 1, 1] : [rng.int(2, 16), rng.int(1, 8), rng.int(1, 8)]
    return { level, lower, sum: lower.reduce((a, b) => a + b, 0) + rng.int(1, 120), order: shuffled(rng, ids) }
  },
  solve: sharpAnswer,
  verify(p) {
    const feasible: number[][] = []
    for (let x = p.lower[0]; x <= p.sum - p.lower.slice(1).reduce((a, b) => a + b, 0); x++) {
      if (p.lower.length === 2) feasible.push([x, p.sum - x])
      else for (let y = p.lower[1]; y <= p.sum - x - p.lower[2]; y++) feasible.push([x, y, p.sum - x - y])
    }
    const maximum = Math.max(...feasible.map(product)), optimizers = feasible.filter(tuple => product(tuple) === maximum)
    const equalTuple = Array.from({ length: p.lower.length }, () => p.sum / p.lower.length)
    const truth = [
      feasible.some(tuple => tuple.every((value, i) => value === equalTuple[i])),
      optimizers.every(tuple => Math.max(...tuple) - Math.min(...tuple) <= 1),
      optimizers.some(tuple => tuple[0] === p.lower[0]),
      optimizers.every(tuple => permutations(tuple).every(permutation => permutation.every((value, i) => value >= p.lower[i]))),
      feasible.some(tuple => tuple[0] >= p.lower[0] + 1 && product(tuple) === maximum),
      optimizers.length === 1,
    ]
    return p.order.flatMap((claim, slot) => truth[ids.indexOf(claim)] ? [ids[slot]] : [])
  },
  render(p, skin) {
    const n = p.lower.length
    return [...text(`An integer ${skin === 'numbers' ? 'inequality problem' : 'allocation problem'} has n=${n} ordered positive coordinates ${n === 2 ? '(x,y)' : '(x,y,z)'}, fixed sum S=${p.sum}, and coordinate-specific lower bounds ${p.lower.join(', ')} in that order. Maximize their product. The feasible set is finite and nonempty. Select every true claim about its bound, equality conditions and maximizing set. An ordered tuple differs from a permutation unless all corresponding coordinates agree.`), ...text('AM–GM says a product of n positive real numbers with sum S is at most (S/n)^n, with equality only when all coordinates equal S/n. A valid upper bound is not automatically attained in an integer or constrained domain.')]
  },
  answer: p => ({ type: 'multi', options: p.order.map((claim, slot) => ({ id: ids[slot], label: sharpClaims[ids.indexOf(claim)] })) }),
  misconceptions: [
    { id: 'every-plausible-bound-claim-is-true', value: () => [...ids], feedback: () => 'A real upper bound, an attained integer optimum and a statement about every optimizer are different claims. Check the domain and each equality condition separately.' },
    { id: 'check-only-amgm-and-ignore-quantifiers', value: p => [ids[p.order.indexOf('a')]], feedback: () => 'AM–GM alone does not settle integrality, coordinate-specific feasibility, existence of an equality case, or uniqueness of the ordered maximizing tuple.' },
  ],
  steps: [
    step(() => 'How many units remain after all lower bounds are satisfied?', p => p.sum - p.lower.reduce((a, b) => a + b, 0), () => 'These units may be distributed only among coordinates that remain feasible.'),
    step(() => 'What is the actual maximum integer product?', p => product(balanced(p.sum, p.lower)!), p => `Balance the unfixed coordinates subject to their lower bounds. The maximum is ${product(balanced(p.sum, p.lower)!)}.`),
    step(() => 'How many ordered tuples attain that maximum?', p => optimalTuples(p).length, p => `${optimalTuples(p).length} distinct ordered tuples attain the optimum. Coordinate-specific bounds can remove some permutations.`),
  ],
  solution(p) { const answers = sharpAnswer(p), truth = sharpTruth(p); return [...text(`Select ${answers.length ? answers.map(id => `claim ${id.toUpperCase()}`).join(', ') : 'no claims'}. The maximizing ordered tuples are ${optimalTuples(p).map(tuple => `(${tuple.join(',')})`).join(', ')}, with product ${product(balanced(p.sum, p.lower)!)}.`), { t: 'list', items: p.order.map((claim, slot) => `Claim ${ids[slot].toUpperCase()}: ${sharpClaims[ids.indexOf(claim)]} ${truth[ids.indexOf(claim)] ? 'True' : 'False'}.`) }, ...text('Equality in the real AM–GM bound requires all coordinates equal. Integrality may prevent that equality, and individual lower bounds may prevent it even when S/n is an integer. Constraint tightening preserves the optimum exactly when at least one old optimizer survives. Inspect the full maximizing set before claiming uniqueness or permutation invariance.') ] },
}

type Assignment = { level: number; weights: number[]; values: number[]; fixedId: string; fixedSlot: number; maximize: boolean; order: string[] }
function assignmentOrder(p: Assignment, maximize = p.maximize): string[] {
  const slots = p.weights.map((weight, index) => ({ weight, index })).filter(slot => p.level < 3 || slot.index !== p.fixedSlot).sort((a, b) => a.weight - b.weight)
  const coefficients = ids.filter(id => p.level < 3 || id !== p.fixedId).sort((a, b) => maximize ? p.values[ids.indexOf(a)] - p.values[ids.indexOf(b)] : p.values[ids.indexOf(b)] - p.values[ids.indexOf(a)])
  const result = Array<string>(6)
  if (p.level === 3) result[p.fixedSlot] = p.fixedId
  slots.forEach((slot, i) => { result[slot.index] = coefficients[i] })
  return result
}
function assignmentValue(p: Assignment, order: string[]): number { return order.reduce((sum, id, slot) => sum + p.weights[slot] * p.values[ids.indexOf(id)], 0) }
export const rearrangementAssignment: Template<Assignment> = {
  id: 'math.optimization.variety.rearrangement-assignment', version: 1, track: 'math', concept: 'math.optimization', family: 'rearrangement-signed-assignment',
  status: 'draft', review, levels: [1, 2, 3].map(level => ({ level, initialRating: 600 + 600 * level })), skins: ['scores', 'positions'], dailyLevels: [1],
  sample(rng, level) {
    const distinct = (signed: boolean): number[] => {
      const set = new Set<number>()
      while (set.size < 6) set.add(rng.int(signed ? -30 : 1, 40))
      return shuffled(rng, [...set])
    }
    return { level, weights: distinct(level >= 2), values: distinct(level >= 2), fixedId: rng.pick(ids), fixedSlot: rng.int(0, 5), maximize: level === 1 || level === 3 && rng.int(0, 1) === 1, order: shuffled(rng, ids) }
  },
  solve: p => assignmentOrder(p),
  verify(p) {
    let winner: string[] = [], optimum = p.maximize ? -Infinity : Infinity
    for (const order of permutations(ids)) {
      if (p.level === 3 && order[p.fixedSlot] !== p.fixedId) continue
      const total = order.reduce((sum, id, i) => sum + p.weights[i] * p.values[ids.indexOf(id)], 0)
      if (p.maximize ? total > optimum : total < optimum) { optimum = total; winner = order }
    }
    return winner
  },
  render(p, skin) {
    return [...text(`Assign six distinct labelled coefficients to six ${skin === 'scores' ? 'score slots' : 'positions'}. Each coefficient must be used exactly once. A slot contributes its weight times the coefficient assigned there. ${p.maximize ? 'Maximize' : 'Minimize'} the sum of the six contributions. All weights are distinct and all coefficient values are distinct, so the stated constrained optimum is unique; negative numbers retain their signs.`), { t: 'table', head: ['Slot, in required answer order', 'Weight'], rows: p.weights.map((value, i) => [String(i + 1), String(value)]) }, { t: 'table', head: ['Coefficient label', 'Value'], rows: p.order.map(id => [id.toUpperCase(), String(p.values[ids.indexOf(id)])]) }, ...(p.level === 3 ? text(`Coefficient ${p.fixedId.toUpperCase()} must occupy slot ${p.fixedSlot + 1}. This assignment is compulsory even if it conflicts with the unconstrained arrangement.`) : []), ...text('Order the coefficient labels to specify the assignments to slots 1 through 6, in that order. The displayed coefficient list is not a proposed solution.')]
  },
  answer: p => ({ type: 'sequence', items: p.order.map(id => ({ id, label: `Coefficient ${id.toUpperCase()} = ${p.values[ids.indexOf(id)]}` })) }),
  misconceptions: [
    { id: 'descending-coefficients-in-displayed-slots', value: p => [...ids].sort((a, b) => p.values[ids.indexOf(b)] - p.values[ids.indexOf(a)]), feedback: () => 'The slots are not necessarily ordered by weight. Match ranks of actual weights and coefficients, and enforce any compulsory assignment before arranging the remainder.' },
    { id: 'reverse-rearrangement-objective', value: p => assignmentOrder(p, !p.maximize), feedback: () => 'Same-order pairing maximizes the product sum; opposite-order pairing minimizes it, even with signed real values. Use the objective actually requested.' },
  ],
  steps: [
    step(() => 'What is the largest slot weight?', p => Math.max(...p.weights), () => 'Rank numerical weights with their signs; absolute magnitude is a different ordering.'),
    step(() => 'What is the smallest coefficient value?', p => Math.min(...p.values), () => 'Keep each value attached to its label when comparing the coefficient ranks.'),
    step(() => 'What is the extremal total under the requested assignment?', p => assignmentValue(p, assignmentOrder(p)), p => `After the correct rearrangement and any compulsory assignment, the extremal total is ${assignmentValue(p, assignmentOrder(p))}.`),
  ],
  solution(p) { const order = assignmentOrder(p); return text(`Assign ${order.map(id => id.toUpperCase()).join(' → ')} to slots 1 through 6. ${p.level === 3 ? `First fix ${p.fixedId.toUpperCase()} in slot ${p.fixedSlot + 1}; its contribution is constant. ` : ''}For the remaining slots, ${p.maximize ? 'match increasing weights with increasing coefficients' : 'match increasing weights with decreasing coefficients'}. If two pairs are crossed, swapping changes the sum by the product of their ordered differences, proving the rearrangement rule without assuming positive values. The extremal sum is ${assignmentValue(p, order)}.`) },
}

export const MATH_SPATIAL = [measurementFoundation, circlePowerAdvanced, transformationAudit, reflectionRoute, extremaFoundation, constrainedExtrema, sharpBoundAudit, rearrangementAssignment] as const
