export const levels = [1, 2, 3, 4, 5].map((level) => ({ level, initialRating: 600 + 200 * level }))
export const exact = { abs: 0.000001 }
export function display(value: number): string { return String(Number(value.toFixed(6))) }
