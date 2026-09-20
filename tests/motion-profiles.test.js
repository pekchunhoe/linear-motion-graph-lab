import test from 'node:test';
import assert from 'node:assert/strict';
import { STVT_PROFILES } from '../js/motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../js/motion-profiles/vtat-profiles.js';
import { model as originalST } from '../js/st-vt/physics.js';
import { model as originalVT } from '../js/vt-at/physics.js';
import { segmentValue, limitsAt, valueAt, facingAt } from '../js/shared/physics-core.js';
import { profileChallenges, correctAnswer } from '../js/shared/activities.js';

const profiles = [...Object.values(STVT_PROFILES), ...Object.values(VTAT_PROFILES)];
const close = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
function integrate(profile, a, b, order, absolute = false) {
  let sum = 0;
  for (const s of profile.segments) {
    const lo = Math.max(a, s.start), hi = Math.min(b, s.end);
    if (hi <= lo) continue;
    const dt = (hi - lo) / 4000;
    for (let i = 0; i < 4000; i++) {
      const value = segmentValue(s, lo + (i + 0.5) * dt, order);
      sum += (absolute ? Math.abs(value) : value) * dt;
    }
  }
  return sum;
}

test('library: meaningful distinct profiles and both original equations preserved', () => {
  assert.equal(Object.keys(STVT_PROFILES).length, 9);
  assert.equal(Object.keys(VTAT_PROFILES).length, 8);
  for (const [original, profile] of [[originalST, STVT_PROFILES.original], [originalVT, VTAT_PROFILES.original]]) {
    for (let i = 0; i <= 300; i++) for (const order of [0, 1, 2]) {
      assert.equal(valueAt(original, original.end * i / 300, order), valueAt(profile, original.end * i / 300, order));
    }
  }
});
for (const p of profiles) {
  const name = `${p.id}/${p.profileId}`;
  test(`validation: ${name} continuous position, finite bounds, metadata and deterministic state`, () => {
    assert.ok(Number.isFinite(p.end) && p.end > 0);
    for (const key of ['title', 'shortTitle', 'description', 'learningFocus', 'category', 'equation']) assert.ok(p[key]?.length);
    for (const bounds of [...p.ranges, p.road]) assert.ok(bounds.every(Number.isFinite) && bounds[1] > bounds[0]);
    assert.equal(p.segments[0].start, 0);
    p.segments.slice(1).forEach((s, i) => {
      assert.equal(s.start, p.segments[i].end);
      close(segmentValue(p.segments[i], s.start), segmentValue(s, s.start));
      if (p.id === 2) close(...limitsAt(p, s.start, 1));
    });
    let previousDistance = 0;
    for (let i = 0; i <= 300; i++) {
      const t = p.end * i / 300, state = p.stateAt(t);
      assert.deepEqual(p.stateAt(t), state);
      assert.ok(Number.isFinite(state.position));
      assert.ok(state.speed === null || state.speed >= 0);
      assert.ok(state.distance >= Math.abs(state.displacement) - 1e-8);
      assert.ok(state.distance >= previousDistance - 1e-8);
      previousDistance = state.distance;
      assert.ok(state.position >= p.road[0] && state.position <= p.road[1]);
      for (const order of [0, 1, 2]) {
        const v = valueAt(p, t, order);
        assert.ok(v === null || (Number.isFinite(v) && v >= p.ranges[order][0] && v <= p.ranges[order][1]));
        if (order) assert.equal(v === null, p.discontinuities[order].some(c => Math.abs(c - t) < 1e-9));
      }
    }
  });
  test(`derivative: ${name} analytical v and a match numerical derivatives`, () => {
    for (const s of p.segments) for (let i = 1; i < 40; i++) {
      const t = s.start + (s.end - s.start) * i / 40, h = 1e-5;
      close((p.positionAt(t + h) - p.positionAt(t - h)) / (2 * h), p.velocityAt(t));
      close((p.velocityAt(t + h) - p.velocityAt(t - h)) / (2 * h), p.accelerationAt(t));
    }
  });
  test(`integral-velocity: ${name} arbitrary intervals match exact displacement`, () => {
    for (const [a, b] of [[0, p.end], [p.end * 0.13, p.end * 0.87], [p.end * 0.3, p.end * 0.51]]) {
      close(integrate(p, a, b, 1), p.positionAt(b) - p.positionAt(a), 1e-4);
      close(p.interval(b, a).displacement, -p.interval(a, b).displacement);
    }
  });
  test(`integral-distance: ${name} absolute velocity integral including reversals`, () => {
    for (const [a, b] of [[0, p.end], [p.end * 0.13, p.end * 0.87]]) {
      close(integrate(p, a, b, 1, true), p.interval(a, b).distance, 1e-4);
      close(p.interval(b, a).distance, p.interval(a, b).distance);
    }
  });
  if (p.id === 2) test(`integral-acceleration: ${name} area equals delta velocity across corners`, () => {
    for (const [a, b] of [[0, p.end], [p.end * 0.13, p.end * 0.87], ...p.segments.map(s => [s.start, s.end])]) {
      close(integrate(p, a, b, 2), p.velocityAt(b) - p.velocityAt(a));
    }
  });
  for (const t of p.zeroCrossings) test(`zero-crossing: ${name} at ${t}s has correct signs, direction and totals`, () => {
    const before = p.stateAt(t - 1e-5), at = p.stateAt(t), after = p.stateAt(t + 1e-5);
    assert.ok(before.velocity * after.velocity < 0);
    assert.equal(at.velocity, 0); assert.equal(at.direction, 'Stationary');
    assert.notEqual(before.direction, after.direction);
    assert.equal(before.motionState, 'Slowing down'); assert.equal(after.motionState, 'Speeding up');
    assert.ok(before.distance <= at.distance && at.distance <= after.distance);
    close(at.distance, integrate(p, 0, t, 1, true), 1e-4);
    close(at.displacement, p.positionAt(t) - p.positionAt(0));
  });
  for (const order of [1, 2]) for (const t of p.discontinuities[order]) {
    test(`corner: ${name} derivative ${order} at ${t}s and one-sided limits`, () => {
      assert.equal(valueAt(p, t, order), null);
      const [left, right] = limitsAt(p, t, order);
      close(valueAt(p, t - 1e-6, order), left, 1e-4);
      close(valueAt(p, t + 1e-6, order), right, 1e-4);
    });
  }
  test(`activities: ${name} all eight challenges have valid answers and no stale time`, () => {
    const questions = profileChallenges(p);
    assert.equal(questions.length, 8);
    for (const [question, answer, hint, solution] of questions) {
      assert.ok(question && hint && solution);
      assert.ok(correctAnswer(answer, answer));
      assert.ok(!correctAnswer('', answer));
      assert.ok(!/NaN|undefined/.test(answer));
      for (const match of question.matchAll(/t = ([\d.]+) s/g)) assert.ok(Number(match[1]) <= p.end);
    }
  });
}

test('regression: stationary at nonzero position and cubic distance count full path', () => {
  assert.equal(STVT_PROFILES.stationary.stateAt(8).distance, 0);
  assert.equal(STVT_PROFILES.stationary.stateAt(8).displacement, 0);
  assert.equal(STVT_PROFILES.stationary.stateAt(8).position, 12);
  assert.equal(STVT_PROFILES['smooth-journey'].stateAt(12).distance, 216);
  assert.equal(STVT_PROFILES['smooth-journey'].stateAt(12).displacement, -144);
  assert.ok(STVT_PROFILES['slowing-down'].velocityAt(8) > 0);
});

test('regression: deterministic car facing retains incoming direction throughout a rest interval', () => {
  for (const t of [9, 9.01, 10, 11, 12]) assert.equal(facingAt(STVT_PROFILES.staged, t), -1);
  assert.equal(facingAt(STVT_PROFILES.staged, 4), 1);
  assert.equal(facingAt(VTAT_PROFILES['negative-to-forward'], 3), -1);
  assert.equal(facingAt(VTAT_PROFILES['negative-to-forward'], 3.01), 1);
  assert.equal(facingAt(STVT_PROFILES.reverse, 4), 1);
  assert.equal(facingAt(STVT_PROFILES.reverse, 4.01), -1);
  assert.equal(facingAt(STVT_PROFILES.stationary, 8), 1);
});
