// Original position equations, expressed about the start of each interval.
// Coefficients are [position, velocity, half acceleration].
export const model = {
  id: 1, end: 30, road: [-100, 100], roadTicks: [-100, 0, 100],
  segments: [
    { start: 0, end: 5, c: [0, 0, 2] },
    { start: 5, end: 10, c: [50, 20, -2] },
    { start: 10, end: 15, c: [100, 0, 0] },
    { start: 15, end: 25, c: [100, -20, 0] },
    { start: 25, end: 30, c: [-100, 20, 0] }
  ]
};
export { stateAt, valueAt, segmentValue, limitsAt, interval, example, classify } from '../shared/physics-core.js';
