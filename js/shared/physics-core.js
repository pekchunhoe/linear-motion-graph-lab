export const clamp = (t, end) => Math.max(0, Math.min(end, Number.isFinite(t) ? t : 0));
const near = (a, b) => Math.abs(a - b) < 1e-9;
export function segmentValue(segment, t, order = 0) {
  const u = t - segment.start;
  const [p, v, halfA] = segment.c;
  return order === 0 ? p + v * u + halfA * u * u : order === 1 ? v + 2 * halfA * u : 2 * halfA;
}
export function limitsAt(model, t, order) {
  const i = model.segments.findIndex((s, index) => index > 0 && near(s.start, t));
  if (i < 0) return null;
  return [segmentValue(model.segments[i - 1], t, order), segmentValue(model.segments[i], t, order)];
}
export function valueAt(model, time, order = 0) {
  const t = clamp(time, model.end);
  // Acceleration also fails to exist when velocity itself has a jump.
  for (let d = 1; d <= order; d++) {
    const limits = limitsAt(model, t, d);
    if (limits && !near(...limits)) return null;
  }
  const segment = model.segments.find(s => t < s.end) ?? model.segments.at(-1);
  const value = segmentValue(segment, t, order);
  return near(value, 0) ? 0 : value;
}
export function interval(model, start, end) {
  const a = clamp(start, model.end), b = clamp(end, model.end);
  let distance = 0;
  for (const s of model.segments) {
    const lo = Math.max(Math.min(a, b), s.start), hi = Math.min(Math.max(a, b), s.end);
    if (hi <= lo) continue;
    const zero = s.c[2] === 0 ? Infinity : s.start - s.c[1] / (2 * s.c[2]);
    const cuts = zero > lo && zero < hi ? [lo, zero, hi] : [lo, hi];
    for (let i = 1; i < cuts.length; i++) distance += Math.abs(segmentValue(s, cuts[i]) - segmentValue(s, cuts[i - 1]));
  }
  const displacement = valueAt(model, b) - valueAt(model, a);
  const v1 = valueAt(model, a, 1), v2 = valueAt(model, b, 1);
  return { displacement, distance, deltaTime: b - a, averageVelocity: near(a, b) ? null : displacement / (b - a),
    initialVelocity: v1, finalVelocity: v2, deltaVelocity: v1 === null || v2 === null ? null : v2 - v1 };
}
export function classify(v, a) {
  if (v === null) return 'Undefined at corner';
  if (a === null) return v === 0 ? 'Instantaneously at rest; acceleration undefined' : 'Acceleration undefined at corner';
  if (near(v, 0)) return near(a, 0) ? 'At rest' : 'Instantaneously at rest';
  if (near(a, 0)) return 'Constant velocity';
  return v * a > 0 ? 'Speeding up' : 'Slowing down';
}
export function stateAt(model, time) {
  const t = clamp(time, model.end), position = valueAt(model, t), velocity = valueAt(model, t, 1), acceleration = valueAt(model, t, 2);
  const totals = interval(model, 0, t);
  return { t, position, displacement: totals.displacement, distance: totals.distance, velocity,
    speed: velocity === null ? null : Math.abs(velocity), acceleration,
    direction: velocity === null ? 'Undefined at corner' : near(velocity, 0) ? 'Stationary' : velocity > 0 ? '+ direction' : '− direction',
    motionState: classify(velocity, acceleration) };
}
export const example = {
  position: t => 2.4 * t ** 2 - 0.12 * t ** 3,
  velocity: t => 4.8 * t - 0.36 * t ** 2,
  acceleration: t => 4.8 - 0.72 * t,
  average: (a, b) => a === b ? null : (example.position(b) - example.position(a)) / (b - a)
};
