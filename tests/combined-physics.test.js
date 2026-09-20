import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBINED_PROFILES } from '../js/combined/profiles.js';
import { STVT_PROFILES } from '../js/motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../js/motion-profiles/vtat-profiles.js';
import { compileCustom } from '../js/custom-motion/custom-profile.js';
import { BuilderState } from '../js/custom-motion/builder-state.js';
import { segmentValue, valueAt, interval, stateAt } from '../js/shared/physics-core.js';
import { createTrackMapping, originVisible } from '../js/shared/motion-track.js';
import { accelerationAreaMessage } from '../js/combined/tools.js';
const close = (a, b, tolerance = 1e-5) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);
const definition = (points, extra = {}) => ({ style: 'straight', points: points.map(([t,y]) => ({t,y})), ...extra });
// Simpson's rule provides an independent integration check, exact for the
// polynomial velocities here. Each segment is integrated separately at corners.
function integrate(model, order, start = 0, end = model.end) {
  return model.segments.reduce((sum, segment) => {
    const a = Math.max(start, segment.start), b = Math.min(end, segment.end);
    if (b <= a) return sum;
    return sum + (b-a)/6 * (segmentValue(segment,a,order) + 4*segmentValue(segment,(a+b)/2,order) + segmentValue(segment,b,order));
  }, 0);
}
test('combined registry reuses ten validated profiles without duplicated coefficients', () => {
  assert.equal(Object.keys(COMBINED_PROFILES).length, 10);
  for (const model of Object.values(COMBINED_PROFILES)) {
    const source = (model.id === 1 ? STVT_PROFILES : VTAT_PROFILES)[model.profileId];
    assert.equal(model.segments, source.segments);
    assert.equal(model.positionAt, source.positionAt);
  }
});
for (const model of Object.values(COMBINED_PROFILES)) {
  test(`combined ${model.profileId}: exact velocity matches position derivative`, () => {
    for (const segment of model.segments) for (const fraction of [.2,.5,.8]) {
      const t = segment.start + (segment.end-segment.start)*fraction, h=1e-4;
      close(valueAt(model,t,1), (valueAt(model,t+h)-valueAt(model,t-h))/(2*h));
    }
  });
  test(`combined ${model.profileId}: exact acceleration matches velocity derivative`, () => {
    for (const segment of model.segments) {
      const t=(segment.start+segment.end)/2,h=1e-4;
      close(valueAt(model,t,2), (valueAt(model,t+h,1)-valueAt(model,t-h,1))/(2*h));
    }
  });
  test(`combined ${model.profileId}: velocity area is position change`, () => {
    close(integrate(model,1), interval(model,0,model.end).displacement);
  });
  test(`combined ${model.profileId}: acceleration area respects jumps`, () => {
    for (const segment of model.segments) {
      close(integrate(model,2,segment.start,segment.end), segmentValue(segment,segment.end,1)-segmentValue(segment,segment.start,1));
    }
    if (!model.discontinuities[1].length) close(integrate(model,2), interval(model,0,model.end).deltaVelocity);
    else assert.match(accelerationAreaMessage(model,0,model.end,String), /finite acceleration area alone cannot/);
  });
}
test('custom position: straight s, constant v, zero finite a and undefined corner', () => {
  const model=compileCustom(1,definition([[0,0],[5,20],[10,20]]));
  assert.deepEqual([valueAt(model,2.5),valueAt(model,2.5,1),valueAt(model,2.5,2)], [10,4,0]);
  assert.deepEqual([valueAt(model,7.5),valueAt(model,7.5,1),valueAt(model,7.5,2)], [20,0,0]);
  assert.equal(valueAt(model,5,1),null);assert.equal(valueAt(model,5,2),null);
  for (const [a,b] of [[0,10],[0,5],[5,10],[5,5]]) assert.match(accelerationAreaMessage(model,a,b,String), /instantaneous velocity change/);
  assert.match(accelerationAreaMessage(model,0,4,String), /Δv = ∫a dt = 0/);
});
test('custom position: smooth derivatives use the same polynomial coefficients', () => {
  const model=compileCustom(1,definition([[0,0],[5,20],[10,20]],{style:'smooth'}));
  for (const segment of model.segments) {
    const u=(segment.end-segment.start)/2,t=segment.start+u,[,b,c,d]=segment.c;
    close(valueAt(model,t,1),b+2*c*u+3*d*u*u);
    close(valueAt(model,t,2),2*c+6*d*u);
  }
  assert.equal(valueAt(model,5,1),0);
  close(integrate(model,2),interval(model,0,10).deltaVelocity);
});
test('custom velocity: triangle integrates to quadratic position and 50 m', () => {
  const model=compileCustom(2,definition([[0,0],[5,10],[10,0]]));
  close(valueAt(model,2.5),6.25);close(valueAt(model,7.5),43.75);
  assert.equal(valueAt(model,2,2),2);assert.equal(valueAt(model,8,2),-2);
  assert.equal(valueAt(model,5,2),null);close(interval(model,0,10).displacement,50);
  assert.match(accelerationAreaMessage(model,0,10,String), /Δv = ∫a dt = 0/);
});
test('custom velocity: initial position shifts position and track only', () => {
  const a=compileCustom(2,definition([[0,0],[5,10],[10,0]]));
  const b=compileCustom(2,definition([[0,0],[5,10],[10,0]],{initialPosition:30}));
  for (const t of [0,2.5,5,7.5,10]) {
    const sa=stateAt(a,t),sb=stateAt(b,t);close(sb.position-sa.position,30);
    for(const key of ['velocity','acceleration','displacement','distance']) assert.equal(sa[key],sb[key]);
  }
  assert.notDeepEqual(a.road,b.road);
  for(const model of [a,b]) assert.equal(originVisible(model.road),model.road[0]<=0&&model.road[1]>=0);
  const origin=compileCustom(2,definition([[0,10],[10,-10]],{initialPosition:-25}));
  close(origin.positionAt(5),0);
  const mapping=createTrackMapping(origin.road,290,42);
  close(mapping.positionToPixel(origin.positionAt(5)),mapping.positionToPixel(0));
});
test('custom velocity: reversal has zero displacement and 50 m distance', () => {
  const model=compileCustom(2,definition([[0,10],[10,-10]]));
  close(valueAt(model,5,1),0);close(valueAt(model,5),25);
  close(interval(model,0,10).displacement,0);close(interval(model,0,10).distance,50);
  assert.equal(valueAt(model,3,2),-2);assert.ok(valueAt(model,4,1)>0&&valueAt(model,6,1)<0);
});
test('custom drafts: independent history includes initial position', () => {
  const position=new BuilderState(1),velocity=new BuilderState(2);
  position.move(1,{t:5,y:30});velocity.apply({...velocity.definition,initialPosition:30});
  velocity.history();assert.equal(velocity.model.positionAt(0),0);assert.equal(position.definition.points[1].y,30);
  velocity.history(true);assert.equal(velocity.model.positionAt(0),30);
});
