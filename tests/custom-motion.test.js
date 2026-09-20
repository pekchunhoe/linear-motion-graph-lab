import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCustom, starter } from '../js/custom-motion/custom-profile.js';
import { BuilderState } from '../js/custom-motion/builder-state.js';
import { rootsAt, segmentValue, interval, facingAt } from '../js/shared/physics-core.js';
import { Graph } from '../js/shared/graph.js';
const definition = (pairs, style = 'straight') => ({ style, points: pairs.map(([t, y]) => ({ t, y })) });
const close = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

for (const [name, pairs, velocity, distance, displacement] of [
  ['forward', [[0,0],[5,20]], 4,20,20],
  ['rest', [[0,15],[5,15]], 0,0,0],
  ['return', [[0,0],[5,20],[10,0]], 4,40,0],
  ['nonzero initial position', [[0,10],[5,30]], 4,20,20]
]) test(`custom STVT ${name}: exact state and distance`, () => {
  const m = compileCustom(1, definition(pairs));
  close(m.velocityAt(2), velocity); close(m.distanceAt(m.end), distance); close(m.displacementAt(m.end), displacement);
  close(m.speedAt(2), Math.abs(velocity)); assert.equal(m.directionAt(2), m.stateAt(2).direction);
});
for (const [name, pairs, acceleration, distance, displacement] of [
  ['accelerating', [[0,0],[5,10]], 2,25,25],
  ['slowing', [[0,10],[5,0]], -2,25,25],
  ['reversal', [[0,10],[10,-10]], -2,50,0],
  ['negative speeding up', [[0,-2],[5,-12]], -2,35,-35]
]) test(`custom VTAT ${name}: analytic position and distance`, () => {
  const m = compileCustom(2, definition(pairs));
  close(m.accelerationAt(2), acceleration); close(m.distanceAt(m.end), distance); close(m.displacementAt(m.end), displacement);
  if (name === 'reversal') { assert.deepEqual(m.zeroCrossings, [5]); assert.equal(facingAt(m, 6), -1); assert.equal(m.stateAt(6).motionState, 'Speeding up'); }
});
test('custom VTAT multisegment integration carries exact cumulative positions', () => {
  const m = compileCustom(2, definition([[0,0],[2,4],[5,4],[7,0]]));
  assert.deepEqual([0,2,5,7].map(t => m.positionAt(t)), [0,4,16,20]);
  assert.deepEqual([1,3,6].map(t => m.accelerationAt(t)), [2,0,-2]); close(m.distanceAt(7),20);
});
for (const family of [1,2]) for (const same of [false,true]) test(`custom corner family ${family}, matching slopes ${same}`, () => {
  const m = compileCustom(family, definition([[0,0],[5,20],[10,same ? 40 : 20]])), derivative = family === 1 ? m.velocityAt : m.accelerationAt;
  close(derivative(5 - 1e-6),4); assert.equal(derivative(5), same ? 4 : null); close(derivative(5 + 1e-6),same ? 4 : 0);
  assert.equal(m.discontinuities[family].includes(5), !same);
  close(derivative(0),4); close(derivative(10),same ? 4 : 0);
});
for (const family of [1,2]) for (const style of ['straight','smooth']) test(`custom ${family}/${style}: numerical derivative/integral cross-check, seeking, ranges`, () => {
  const m = compileCustom(family, definition([[0,5],[2,20],[5,-10],[7,0],[10,5]],style));
  let numericalDistance = 0, numericalIntegral = 0, previousDistance = 0;
  const steps = 20000, dt = m.end / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + .5) * dt, v = m.velocityAt(t), s = m.stateAt(t);
    numericalDistance += Math.abs(v) * dt; numericalIntegral += v * dt;
    if (i % 99) continue;
    const epsilon = 1e-5;
    close((m.positionAt(t + epsilon) - m.positionAt(t - epsilon)) / (2 * epsilon), v, 1e-5);
    close((m.velocityAt(t + epsilon) - m.velocityAt(t - epsilon)) / (2 * epsilon), m.accelerationAt(t), 1e-4);
    assert.ok(s.distance >= previousDistance); previousDistance = s.distance;
    assert.ok(s.position >= m.road[0] && s.position <= m.road[1]);
    for (const [order, value] of [[0,s.position],[1,v],[2,s.acceleration]]) assert.ok(value >= m.ranges[order][0] && value <= m.ranges[order][1]);
  }
  close(m.distanceAt(m.end),numericalDistance,1e-4); close(m.displacementAt(m.end),numericalIntegral,1e-4);
  const sought = m.stateAt(3.7); m.stateAt(9); m.stateAt(0); assert.deepEqual(m.stateAt(3.7),sought);
  const a = interval(m,1,9), b = interval(m,9,1); close(a.distance,b.distance); close(a.displacement,-b.displacement);
});
for (const family of [1,2]) test(`custom smooth ${family}: joins and no primary overshoot`, () => {
  const m = compileCustom(family, definition([[0,-20],[.25,10],[10,12],[11,-5]], 'smooth'));
  for (const t of [.25,10]) assert.notEqual(family === 1 ? m.velocityAt(t) : m.accelerationAt(t),null);
  for (const s of m.primarySegments) for (let i = 0; i <= 100; i++) {
    const ends = [segmentValue(s,s.start),segmentValue(s,s.end)], y = segmentValue(s,s.start + (s.end-s.start)*i/100);
    assert.ok(y >= Math.min(...ends)-1e-8 && y <= Math.max(...ends)+1e-8);
  }
});
test('custom VTAT acceleration area equals delta velocity across smooth and straight corners', () => {
  for (const style of ['straight','smooth']) {
    const m = compileCustom(2, definition([[0,10],[3,0],[6,-5],[8,4]],style));
    for (const [a,b] of [[0,8],[1,6],[3,8],[3,3]]) {
      let area = 0;
      for (const s of m.segments) {
        const lo = Math.max(a,s.start), hi = Math.min(b,s.end);
        if (hi > lo) area += segmentValue(s,hi,1)-segmentValue(s,lo,1);
      }
      close(area,interval(m,a,b).deltaVelocity);
    }
  }
});
for (const [c, expected] of [[[ -6,11,-6,1],[1,2,3]], [[-1,0,0,1],[1]], [[2,-3,0,1],[1]], [[0,0,0,1],[0]]]) test(`cubic velocity roots ${c}`, () => {
  const roots = rootsAt({start:0,end:4,c:[0,...c.map((v,i)=>v/(i+1))]});
  for (const root of expected) assert.ok(roots.some(value => Math.abs(value-root)<1e-7));
  for (const root of roots) close(c.reduceRight((v,c)=>v*root+c,0),0);
});
for (const [name, mutate] of [
  ['duplicate', d => d.points[1].t=0], ['unordered', d=>d.points[2].t=1],
  ['NaN', d=>d.points[1].y=NaN], ['infinite', d=>d.points[1].t=Infinity],
  ['missing coordinate', d=>delete d.points[0].y], ['invalid start', d=>d.points[0].t=1],
  ['too many', d=>d.points=Array.from({length:13},(_,i)=>({t:i,y:0}))], ['too few',d=>d.points=[]],
  ['duration', d=>d.points.at(-1).t=61], ['value bound',d=>d.points[1].y=1001], ['style',d=>d.style='freehand']
]) test(`validation rejects ${name} and retains last valid model`, () => {
  const state = new BuilderState(1), before = state.model, d = starter(1); mutate(d);
  assert.throws(()=>state.apply(d)); assert.equal(state.model,before); assert.equal(state.undoStack.length,0);
});
for (const family of [1,2]) test(`history ${family}: drag is one transaction, add/delete/style/reset exact undo/redo`, () => {
  const s = new BuilderState(family), initial = structuredClone(s.definition);
  s.begin(); for (let i=0;i<50;i++) s.move(1,{t:4,y:i}); s.commit();
  const moved = structuredClone(s.definition); assert.equal(s.undoStack.length,1);
  s.history(); assert.deepEqual(s.definition,initial); s.history(true); assert.deepEqual(s.definition,moved);
  for (const operation of [()=>s.add(),()=>s.remove(),()=>s.apply({...s.definition,style:'smooth'}),()=>s.reset()]) {
    const before = structuredClone(s.definition); operation(); const after = structuredClone(s.definition);
    s.history(); assert.deepEqual(s.definition,before); s.history(true); assert.deepEqual(s.definition,after);
  }
  const other = new BuilderState(family===1?2:1); s.move(1,{t:4,y:3}); assert.equal(other.undoStack.length,0);
});
test('point constraints, minimum count, duration, history branching and bounded history', () => {
  const s = new BuilderState(1); s.move(1,{t:100,y:2000},true); close(s.definition.points[1].t,7.75); close(s.definition.points[1].y,1000);
  s.move(0,{t:3,y:1},true); assert.equal(s.definition.points[0].t,0);
  s.remove(); s.remove(); assert.throws(()=>s.remove());
  for (let i=0;i<80;i++) s.move(0,{t:0,y:i}); assert.equal(s.undoStack.length,60);
  s.history(); s.move(0,{t:0,y:-1}); assert.equal(s.redoStack.length,0);
});
test('bounded smooth drafts: extreme slopes, finite ranges, continuous first derivatives and monotonic distance', () => {
  let seed = 1729;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const family of [1,2]) for (let trial = 0; trial < 40; trial++) {
    const points = [{t:0,y:0}], limit = family === 1 ? 1000 : 100;
    for (let i=1;i<12;i++) points.push({t:points.at(-1).t + .25 + random()*4, y:(random()*2-1)*limit});
    const m=compileCustom(family,{style:'smooth',points}); let previous=0;
    for (const p of points) {
      close(family===1?m.positionAt(p.t):m.velocityAt(p.t),p.y,1e-6);
      assert.notEqual(family===1?m.velocityAt(p.t):m.accelerationAt(p.t),null);
    }
    for(let i=0;i<=200;i++) {
      const s=m.stateAt(m.end*i/200);assert.ok(Number.isFinite(s.position)&&Number.isFinite(s.distance));
      assert.ok(s.distance>=previous-1e-7);previous=s.distance;
      assert.ok(s.position>=m.road[0]-1e-6&&s.position<=m.road[1]+1e-6);
    }
  }
});
for (const family of [1,2]) test(`custom graph ${family}: no tangent at corner, open endpoints and finite canvas coordinates`, () => {
  const m = compileCustom(family,starter(family)), arcs = [], lines=[];
  const context = new Proxy({arc(...args){args.forEach(v=>assert.ok(Number.isFinite(v)));arcs.push(args);}}, {get:(o,k)=>o[k]??(()=>{})});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:200,left:0}),closest:()=>null};
  globalThis.window={devicePixelRatio:2};
  const g=new Graph(canvas,m,family-1,m.ranges[family-1]); g.resize();g.line=(...args)=>lines.push(args);g.draw(4,{tangent:true});
  assert.ok(!lines.some(l=>JSON.stringify(l[5])==='[6,4]')); assert.equal(canvas.width,640);
  g.order=family;g.range=m.ranges[family];g.draw(4);assert.ok(arcs.length>=4);
});
