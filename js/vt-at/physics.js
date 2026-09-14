// Original integrated velocity motion. Coefficients: position, velocity, a/2.
export const model = {
  id: 2, end: 18, road: [0, 150], roadTicks: [0, 50, 100, 150],
  segments: [
    { start: 0, end: 4, c: [0, 0, 2.5] },
    { start: 4, end: 8, c: [40, 20, 0] },
    { start: 8, end: 12, c: [120, 20, -6.25] },
    { start: 12, end: 18, c: [100, -30, 2.5] }
  ]
};
export { stateAt, valueAt, segmentValue, limitsAt, interval, example, classify } from '../shared/physics-core.js';
