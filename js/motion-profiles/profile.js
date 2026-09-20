import { segmentValue, rootsAt, valueAt, interval, stateAt } from '../shared/physics-core.js';

export function boundsFor(segments, order) {
  const values = segments.flatMap(segment => [segment.start, segment.end, ...rootsAt(segment, order + 1)]
    .map(t => segmentValue(segment, t, order)));
  return [Math.min(...values), Math.max(...values)];
}
export function axisRange([min, max]) {
  const lo = Math.min(0, min), hi = Math.max(0, max);
  const span = hi - lo || 2;
  const step = 10 ** Math.floor(Math.log10(span)) / 2;
  return [Math.floor((lo - span * 0.08) / step) * step, Math.ceil((hi + span * 0.08) / step) * step];
}
function roadScale(bounds) {
  const range = axisRange(bounds);
  // Three labels stay legible on a 320px phone, including stationary profiles.
  return { road: range, roadTicks: [range[0], (range[0] + range[1]) / 2, range[1]] };
}
export function makeProfile(family, definition) {
  const { segments, ...metadata } = definition;
  if (segments.some(s => s.c.length > 4)) throw new Error('Presets support position polynomials through degree three.');
  const profile = { ...metadata, id: family, segments, end: segments.at(-1).end };
  profile.duration = profile.end;
  profile.shortTitle ??= profile.title;
  profile.ranges = [0, 1, 2].map(order => axisRange(boundsFor(segments, order)));
  Object.assign(profile, roadScale(boundsFor(segments, 0)), metadata.road ? { road: metadata.road, roadTicks: metadata.roadTicks } : {});
  profile.discontinuities = { 1: [], 2: [] };
  for (const order of [1, 2]) profile.discontinuities[order] = segments.slice(1)
    .map(s => s.start).filter(t => valueAt(profile, t, order) === null);
  profile.zeroCrossings = [...new Set(segments.flatMap(s => rootsAt(s)))].filter(t => {
    const epsilon = 1e-6;
    return t > 0 && t < profile.end && valueAt(profile, t, 1) === 0
      && valueAt(profile, t - epsilon, 1) * valueAt(profile, t + epsilon, 1) < 0;
  }).sort((a, b) => a - b);
  profile.importantTimes = [...new Set([0, ...segments.map(s => s.end), ...profile.zeroCrossings])].sort((a, b) => a - b);
  profile.positionAt = t => valueAt(profile, t);
  profile.velocityAt = t => valueAt(profile, t, 1);
  profile.accelerationAt = t => valueAt(profile, t, 2);
  profile.stateAt = t => stateAt(profile, t);
  profile.interval = (a, b) => interval(profile, a, b);
  return profile;
}

// VTAT authors define velocity coefficients; exact integration carries position
// continuously from each stage to the next. No frame-by-frame integration.
export function velocityProfile(definition) {
  let position = definition.initialPosition ?? 0;
  const segments = definition.velocitySegments.map(({ start, end, c }) => {
    const segment = { start, end, c: [position, ...c.map((v, i) => v / (i + 1))] };
    position = segmentValue(segment, end);
    return segment;
  });
  return makeProfile(2, { ...definition, segments });
}
