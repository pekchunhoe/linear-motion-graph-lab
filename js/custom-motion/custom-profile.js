import { makeProfile } from '../motion-profiles/profile.js';
import { clamp, rootsAt, segmentValue } from '../shared/physics-core.js';

export const MAX_POINTS = 12, MIN_GAP = 0.25, MAX_DURATION = 60;
export const valueLimit = family => family === 1 ? 1000 : 100;
export const starter = family => ({ style: 'straight', points: [
  { t: 0, y: 0 }, { t: 4, y: family === 1 ? 20 : 12 },
  { t: 8, y: family === 1 ? 20 : 12 }, { t: 12, y: 0 }
] });
export function validateDefinition(family, definition) {
  if (![1, 2].includes(family)) throw new Error('Unknown motion family.');
  if (!definition || !['straight', 'smooth'].includes(definition.style)) throw new Error('Choose Straight or Smooth.');
  const points = definition.points;
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS) throw new Error('Use 2–12 points.');
  points.forEach((point, i) => {
    if (!point || !Number.isFinite(point.t) || !Number.isFinite(point.y)) throw new Error('Enter finite time and value coordinates.');
    if (point.t < 0 || point.t > MAX_DURATION || (i === 0 && point.t !== 0)) throw new Error('Start at 0 s; duration must be at most 60 s.');
    if (i && point.t - points[i - 1].t < MIN_GAP - 1e-10) throw new Error('Keep neighbouring points at least 0.25 s apart.');
    if (Math.abs(point.y) > valueLimit(family)) throw new Error(`Values must be between −${valueLimit(family)} and +${valueLimit(family)}.`);
  });
}

// Monotone cubic Hermite: weighted harmonic interior slopes, zero at extrema,
// endpoint secant slopes. No extra handles and no overshoot between nodes.
export function primarySegments({ points, style }) {
  const h = points.slice(1).map((p, i) => p.t - points[i].t);
  const d = h.map((dt, i) => (points[i + 1].y - points[i].y) / dt);
  const m = points.map((_, i) => {
    if (i === 0) return d[0];
    if (i === points.length - 1) return d.at(-1);
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  return h.map((dt, i) => ({ start: points[i].t, end: points[i + 1].t,
    c: style === 'straight' ? [points[i].y, d[i]] : [points[i].y, m[i],
      (3 * d[i] - 2 * m[i] - m[i + 1]) / dt, (m[i] + m[i + 1] - 2 * d[i]) / dt ** 2] }));
}

export function compileCustom(family, definition) {
  validateDefinition(family, definition);
  const primary = primarySegments(definition);
  let position = 0, distance = 0;
  const segments = primary.map(s => {
    const segment = family === 1 ? { ...s, c: [...s.c] }
      : { ...s, c: [position, ...s.c.map((c, i) => c / (i + 1))] };
    position = segmentValue(segment, segment.end);
    segment.roots = Object.fromEntries([1, 2, 3].map(order => [order, rootsAt(segment, order)]));
    segment.distanceAtStart = distance;
    const cuts = [segment.start, ...segment.roots[1], segment.end];
    for (let i = 1; i < cuts.length; i++) distance += Math.abs(segmentValue(segment, cuts[i]) - segmentValue(segment, cuts[i - 1]));
    return segment;
  });
  const model = makeProfile(family, { profileId: 'custom', title: `Custom ${family === 1 ? 'position' : 'velocity'} motion`,
    description: 'Edit the primary graph. Its exact mathematics drives this motion.',
    learningFocus: family === 1 ? 'Position gradient → velocity.' : 'Velocity gradient → acceleration; signed area → displacement.',
    equation: 'Local polynomial coefficients are shown in the builder.', segments });
  model.primarySegments = primary;
  model.distanceAt = time => {
    const t = clamp(time, model.end), s = segments.find(s => t < s.end) ?? segments.at(-1);
    const cuts = [s.start, ...s.roots[1].filter(r => r > s.start && r < t), t];
    let result = s.distanceAtStart;
    for (let i = 1; i < cuts.length; i++) result += Math.abs(segmentValue(s, cuts[i]) - segmentValue(s, cuts[i - 1]));
    return result;
  };
  model.displacementAt = t => model.positionAt(t) - model.positionAt(0);
  model.speedAt = t => { const v = model.velocityAt(t); return v === null ? null : Math.abs(v); };
  model.directionAt = t => model.stateAt(t).direction;
  return model;
}
