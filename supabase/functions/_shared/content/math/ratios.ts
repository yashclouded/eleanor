import type { Template } from '../types.ts'
import { display, exact, levels } from './common.ts'

type Work = { workersA: number; rateA: number; workersB: number; rateB: number; delay: number; idle: number; work: number }
function finish(p: Work): number {
  return p.delay + p.idle + (p.work - p.workersA * p.rateA * p.delay) / (p.workersA * p.rateA + p.workersB * p.rateB)
}
export const ratesWorkTemplate: Template<Work> = {
  id: 'math.ratios.rates-work', version: 1, track: 'math', concept: 'math.ratios', family: 'constant-work-rates',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['packing', 'printing'], dailyLevels: [4, 5],
  sample(rng, level) {
    const workersA = level >= 4 ? rng.int(2, 5) : 1
    const workersB = level === 1 ? 0 : level === 5 ? rng.int(2, 5) : 1
    const rateA = rng.int(2, 12), rateB = rng.int(2, 12)
    const delay = level >= 3 ? rng.int(1, 5) : 0
    const idle = level >= 4 ? rng.int(1, 3) : 0
    const work = workersA * rateA * delay + (workersA * rateA + workersB * rateB) * rng.int(2, 15)
    return { workersA, rateA, workersB, rateB, delay, idle, work }
  },
  solve: finish,
  verify(p) {
    let completed = 0, hour = 0
    while (completed < p.work) {
      const rate = hour < p.delay ? p.workersA * p.rateA
        : hour < p.delay + p.idle ? 0 : p.workersA * p.rateA + p.workersB * p.rateB
      if (rate && completed + rate >= p.work) return hour + (p.work - completed) / rate
      completed += rate
      hour++
      if (hour > 1000) throw new Error('Work schedule did not finish')
    }
    return hour
  },
  render: (p, skin) => [
    { t: 'p', text: `${skin === 'packing' ? 'A packing job' : 'A print job'} requires ${p.work} units of work. Team A has ${p.workersA} workers, each completing ${p.rateA} units per hour at a constant rate.` },
    { t: 'p', text: `Team A starts at hour 0 and works alone for ${p.delay} hours. All work then stops for ${p.idle} hours. After that, team A continues${p.workersB ? ` with team B (${p.workersB} workers, each completing ${p.rateB} units per hour)` : ' alone'} until the job is complete. Rates add without interference. At what hour is the job finished?` },
  ],
  answer: () => ({ type: 'number', unit: 'hours', tolerance: exact }),
  misconceptions: [
    { id: 'ignore-early-work', value: (p) => p.delay + p.idle + p.work / (p.workersA * p.rateA + p.workersB * p.rateB), feedback: () => 'Work completed before the teams join reduces what remains. Subtract that work before dividing by the combined rate.' },
    { id: 'ignore-second-team-or-worker-count', value: (p) => p.work / p.rateA, feedback: () => 'A per-worker rate is not necessarily the total rate. Count workers, add simultaneous rates, and account for the schedule.' },
    { id: 'multiply-rate-and-work', value: (p) => p.work * p.rateA, feedback: () => 'Work divided by work per hour gives hours. Multiplying those quantities gives the wrong units.' },
  ],
  steps: [
    { prompt: () => [{ t: 'p', text: 'How many units does team A complete before the pause?' }], answer: (p) => p.workersA * p.rateA * p.delay, tolerance: exact, explain: (p) => [{ t: 'p', text: `${p.workersA} × ${p.rateA} × ${p.delay} units are completed early.` }] },
    { prompt: () => [{ t: 'p', text: 'What is the total hourly rate after the pause?' }], answer: (p) => p.workersA * p.rateA + p.workersB * p.rateB, tolerance: exact, explain: () => [{ t: 'p', text: 'Multiply each per-worker rate by its worker count, then add the rates of the teams working together.' }] },
    { prompt: () => [{ t: 'p', text: 'At what hour does the job finish, including the early phase and pause?' }], answer: finish, tolerance: exact, explain: (p) => [{ t: 'p', text: `Elapsed time is early work time + idle time + remaining work / combined rate = ${display(finish(p))} hours.` }] },
  ],
  solution: (p) => [{ t: 'p', text: `Use work = rate × time. Early work is ${p.workersA * p.rateA * p.delay}, leaving ${p.work - p.workersA * p.rateA * p.delay} units. The later rate is ${p.workersA * p.rateA + p.workersB * p.rateB} units/hour. Finish at ${p.delay} + ${p.idle} + ${p.work - p.workersA * p.rateA * p.delay} / ${p.workersA * p.rateA + p.workersB * p.rateB} = ${display(finish(p))} hours.` }],
}

type Conversion = { mode: number; value: number; width: number; height: number; flow: number }
function converted(p: Conversion): number {
  switch (p.mode) {
    case 1: return p.value / 100
    case 2: return p.value * 3.6
    case 3: return p.value / 10000
    case 4: return p.value * 60 / 1000
    default: return p.value * p.width * p.height / 1000 / p.flow
  }
}
export const unitConversionTemplate: Template<Conversion> = {
  id: 'math.ratios.unit-conversion', version: 1, track: 'math', concept: 'math.ratios', family: 'dimensional-conversion',
  status: 'draft', review: { author: 'GPT-6', reviewer: null, reviewedAt: null }, levels, skins: ['workshop', 'garden'], dailyLevels: [4, 5],
  sample: (rng, level) => ({ mode: level, value: rng.int(10, 200), width: rng.int(10, 80), height: rng.int(10, 80), flow: rng.int(2, 20) }),
  solve: converted,
  verify(p) {
    // Convert through base centimetres, seconds and cubic centimetres rather than the solve factors.
    if (p.mode === 1) return p.value * 0.01
    if (p.mode === 2) return (p.value / 1000) / (1 / 3600)
    if (p.mode === 3) return p.value * 0.01 * 0.01
    if (p.mode === 4) return (p.value / 1000 / 60) * 3600
    const cubicMetres = (p.value / 100) * (p.width / 100) * (p.height / 100)
    return cubicMetres / (p.flow / 1000)
  },
  render: (p, skin) => [
    { t: 'p', text: `A ${skin === 'workshop' ? 'workshop' : 'garden project'} uses metric measurements. Use 100 cm = 1 m, 1000 m = 1 km, 60 s = 1 min, 60 min = 1 h, and 1000 L = 1 m³ = 1,000,000 cm³.` },
    { t: 'p', text: [ '', `Convert a length of ${p.value} cm to metres.`, `Convert a constant speed of ${p.value} m/s to km/h.`, `Convert an area of ${p.value} cm² to m².`, `Convert a constant flow of ${p.value} L/min to m³/h.`, `An empty rectangular tank has internal dimensions ${p.value} cm × ${p.width} cm × ${p.height} cm. At a constant inflow of ${p.flow} L/min, with no leaks, how many minutes does filling it take?` ][p.mode] },
  ],
  answer: (p) => ({ type: 'number', unit: ['', 'm', 'km/h', 'm²', 'm³/h', 'minutes'][p.mode], tolerance: exact }),
  misconceptions: [
    { id: 'invert-conversion-factor', value: (p) => [0, p.value * 100, p.value / 3.6, p.value * 10000, p.value * 1000 / 60, p.value * p.width * p.height * 1000 / p.flow][p.mode], feedback: () => 'Write the conversion as a fraction with units. The old unit must cancel, which fixes the direction of the factor.' },
    { id: 'leave-units-unchanged', value: (p) => p.mode === 5 ? p.value * p.width * p.height / p.flow : p.value, feedback: () => 'Changing the unit label alone does not convert the quantity. Areas require a squared length factor, and volumes require a cubed one.' },
  ],
  steps: [
    { prompt: (p) => [{ t: 'p', text: p.mode === 5 ? 'What is the tank volume in cubic centimetres?' : 'What numerical quantity is supplied in the original unit?' }], answer: (p) => p.mode === 5 ? p.value * p.width * p.height : p.value, tolerance: exact, explain: () => [{ t: 'p', text: 'Keep the original unit attached while setting up the conversion.' }] },
    { prompt: (p) => [{ t: 'p', text: p.mode === 5 ? 'What is the tank volume in litres?' : 'What multiplier converts one original unit into the requested unit?' }], answer: (p) => p.mode === 5 ? p.value * p.width * p.height / 1000 : [0, 0.01, 3.6, 0.0001, 0.06][p.mode], tolerance: exact, explain: () => [{ t: 'p', text: 'Cancel units explicitly. For area, square the length factor; for volume, use 1000 cm³ per litre.' }] },
    { prompt: () => [{ t: 'p', text: 'What is the final value in the requested unit?' }], answer: converted, tolerance: exact, explain: (p) => [{ t: 'p', text: `The converted result is ${display(converted(p))}${p.mode === 5 ? ' minutes, from volume / inflow' : ''}.` }] },
  ],
  solution: (p) => [{ t: 'p', text: [ '', `${p.value} cm × (1 m / 100 cm) = ${display(converted(p))} m.`, `${p.value} m/s × (1 km / 1000 m) × (3600 s / h) = ${display(converted(p))} km/h.`, `${p.value} cm² × (1 m / 100 cm)² = ${display(converted(p))} m².`, `${p.value} L/min × (1 m³ / 1000 L) × (60 min / h) = ${display(converted(p))} m³/h.`, `Volume = ${p.value} × ${p.width} × ${p.height} / 1000 = ${display(p.value * p.width * p.height / 1000)} L. Time = volume / ${p.flow} L/min = ${display(converted(p))} minutes.` ][p.mode] }],
}
