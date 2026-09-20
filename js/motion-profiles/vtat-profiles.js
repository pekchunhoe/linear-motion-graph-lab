import { velocityProfile } from './profile.js';

// c contains velocity coefficients in u = t − segment.start, ascending powers.
const definitions = [
  { profileId: 'original', title: 'Original multi-stage journey', category: 'Multi-stage motion',
    description: 'Accelerate, cruise, reverse, then slow backward.', learningFocus: 'Compare signed area, distance and acceleration across a reversal.',
    equation: 'v = 5t (0–4); 20 (4–8); 20−12.5u, u=t−8 (8–12); −30+5u, u=t−12 (12–18)',
    road: [0, 150], roadTicks: [0, 50, 100, 150],
    velocitySegments: [{ start: 0, end: 4, c: [0, 5] }, { start: 4, end: 8, c: [20] }, { start: 8, end: 12, c: [20, -12.5] }, { start: 12, end: 18, c: [-30, 5] }] },
  { profileId: 'constant-forward', title: 'Constant forward velocity', category: 'Basic motion',
    description: 'Positive constant velocity; zero acceleration.', learningFocus: 'A horizontal velocity graph means steady motion, not rest.',
    equation: 'v = 4', velocitySegments: [{ start: 0, end: 10, c: [4] }] },
  { profileId: 'from-rest', title: 'Accelerating from rest', category: 'Accelerated motion',
    description: 'Velocity rises from rest at a constant rate.', learningFocus: 'Gradient gives acceleration; triangular area gives displacement.',
    equation: 'v = 2t', velocitySegments: [{ start: 0, end: 8, c: [0, 2] }] },
  { profileId: 'slowing-forward', title: 'Slowing down forward', category: 'Accelerated motion',
    description: 'Positive velocity falls to zero without reversing.', learningFocus: 'Negative acceleration can slow a forward-moving object.',
    equation: 'v = 12 − 2t', velocitySegments: [{ start: 0, end: 6, c: [12, -2] }] },
  { profileId: 'reverse', title: 'Forward → stop → reverse', category: 'Reversal',
    description: 'Cross zero: slow forward, then speed backward.', learningFocus: 'Constant negative acceleration does not always mean slowing down.',
    equation: 'v = 8 − 2t', velocitySegments: [{ start: 0, end: 8, c: [8, -2] }] },
  { profileId: 'negative-to-forward', title: 'Backward → stop → forward', category: 'Reversal',
    description: 'Slow backward, stop, then speed forward.', learningFocus: 'Velocity determines direction; compare its sign with acceleration.',
    equation: 'v = −6 + 2t', velocitySegments: [{ start: 0, end: 6, c: [-6, 2] }] },
  { profileId: 'cruise', title: 'Accelerate → cruise → decelerate', shortTitle: 'Accelerate, cruise, decelerate', category: 'Multi-stage motion',
    description: 'Velocity rises, stays level, then falls to rest.', learningFocus: 'Piecewise velocity slopes give constant acceleration stages and undefined corners.',
    equation: 'v = 3t (0–3); 9 (3–7); 9−3u, u=t−7 (7–10)',
    velocitySegments: [{ start: 0, end: 3, c: [0, 3] }, { start: 3, end: 7, c: [9] }, { start: 7, end: 10, c: [9, -3] }] },
  { profileId: 'constant-backward', title: 'Constant backward velocity', category: 'Basic motion',
    description: 'Negative constant velocity; zero acceleration.', learningFocus: 'Negative velocity is different from negative acceleration.',
    equation: 'v = −5', velocitySegments: [{ start: 0, end: 8, c: [-5] }] }
];
export const VTAT_PROFILES = Object.fromEntries(definitions.map(d => [d.profileId, velocityProfile(d)]));
