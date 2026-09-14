import test from 'node:test';
import assert from 'node:assert/strict';
import { model, stateAt, valueAt, interval, limitsAt, example, classify } from '../js/vt-at/physics.js';
import { challenges, correctAnswer } from '../js/shared/activities.js';
const close = (a,b,tol=1e-6) => assert.ok(Math.abs(a-b)<tol, `${a} ≠ ${b}`);
const derivative = (f,t) => (f(t+1e-5)-f(t-1e-5))/2e-5;
// Midpoint quadrature deliberately does not reuse the analytic integral code.
function integrate(f,a,b,n=10000) {
  const dt=(b-a)/n;
  let result=0;
  for(let i=0;i<n;i++) result+=f(a+(i+0.5)*dt)*dt;
  return result;
}
for (const segment of model.segments) {
  for (const fraction of [0.1,0.5,0.9]) {
    const t=segment.start+(segment.end-segment.start)*fraction;
    test(`slope relationships at ${t} s`,()=> {
      close(derivative(t=>valueAt(model,t),t),valueAt(model,t,1));
      close(derivative(t=>valueAt(model,t,1),t),valueAt(model,t,2));
    });
  }
  test(`velocity integral on ${segment.start}–${segment.end}`,()=> {
    close(integrate(t=>valueAt(model,t,1),segment.start,segment.end),valueAt(model,segment.end)-valueAt(model,segment.start));
  });
}
for (const boundary of model.segments.slice(1).map(s=>s.start)) {
  test(`position continuous at ${boundary}`,()=> {
    const [left,right]=limitsAt(model,boundary,0); close(left,right);
    close(valueAt(model,boundary-1e-7),valueAt(model,boundary+1e-7),1e-5);
  });
}
test('acceleration undefined at every slope-change boundary',()=> {
  for (const s of model.segments.slice(1)) assert.equal(stateAt(model,s.start).acceleration,null);
});
test('distance never decreases and always bounds displacement',()=> {
  let distance=0;
  for(let i=0;i<=1000;i++) {
    const state=stateAt(model,i*model.end/1000);
    assert.ok(state.distance>=distance-1e-8); assert.ok(state.distance>=Math.abs(state.displacement)-1e-8);
    distance=state.distance;
    for(const v of Object.values(state)) if(typeof v==='number') assert.ok(Number.isFinite(v));
  }
});
test('interval distance and displacement independently integrate velocity',()=> {
  for(const [a,b] of [[0,model.end],[2,7],[7,14]]) {
    const splits=[a,...model.segments.map(s=>s.start).filter(t=>t>a&&t<b),b];
    let signed=0,absolute=0;
    for(let i=1;i<splits.length;i++) {
      signed+=integrate(t=>valueAt(model,t,1),splits[i-1],splits[i]);
      absolute+=integrate(t=>Math.abs(valueAt(model,t,1)),splits[i-1],splits[i]);
    }
    close(interval(model,a,b).displacement,signed,1e-5); close(interval(model,a,b).distance,absolute,1e-5);
  }
});
test('equal and reversed secant endpoints',()=> {
  assert.equal(interval(model,5,5).averageVelocity,null);
  close(interval(model,3,9).averageVelocity,interval(model,9,3).averageVelocity);
  close(interval(model,3,9).distance,interval(model,9,3).distance);
});
test('invalid and out-of-range time is clamped',()=> {
  for(const t of [NaN,Infinity,-10]) assert.equal(stateAt(model,t).t,0);
  assert.equal(stateAt(model,100).t,model.end);
});
for(const [v,a,expected] of [[2,3,'Speeding up'],[-2,-3,'Speeding up'],[2,-3,'Slowing down'],[-2,3,'Slowing down'],[2,0,'Constant velocity'],[0,0,'At rest'],[0,2,'Instantaneously at rest'],[null,0,'Undefined at corner']]) {
  test(`motion classification v=${v}, a=${a}`,()=>assert.equal(classify(v,a),expected));
}
if(model.id===1) {
  test('original position equations retained',()=> {
    for(const [t,s,v] of [[0,0,0],[3,18,12],[5,50,20],[7,82,12],[10,100,0],[12,100,0],[20,0,-20],[25,-100,null],[28,-40,20],[30,0,20]]) {
      close(valueAt(model,t),s); assert.equal(valueAt(model,t,1),v);
    }
  });
  test('velocity undefined only at actual position corners',()=> {
    for(const t of [15,25]) { assert.equal(valueAt(model,t,1),null); assert.equal(stateAt(model,t).speed,null); }
    for(const t of [5,10]) assert.notEqual(valueAt(model,t,1),null);
    assert.deepEqual(limitsAt(model,15,1),[0,-20]); assert.deepEqual(limitsAt(model,25,1),[-20,20]);
  });
  test('return journey distance 400 m differs from displacement 0 m',()=> {
    const s=stateAt(model,30); close(s.distance,400); close(s.displacement,0);
    close(interval(model,0,10).averageVelocity,10);
  });
} else {
  test('original integrated equations and velocity are retained',()=> {
    for(const [t,p,v] of [[0,0,0],[2,10,10],[4,40,20],[6,80,20],[8,120,20],[9.6,136,0],[10,135,-5],[12,100,-30],[15,32.5,-15],[18,10,0]]) {
      close(valueAt(model,t),p); close(valueAt(model,t,1),v);
    }
  });
  test('acceleration area equals velocity change, including corner endpoints',()=> {
    for(const [a,b] of [[0,18],[4,8],[8,12],[3,15]]) {
      const splits=[a,...[4,8,12].filter(t=>t>a&&t<b),b];
      let area=0;
      for(let i=1;i<splits.length;i++) area+=integrate(t=>valueAt(model,t,2),splits[i-1],splits[i]);
      close(area,interval(model,a,b).deltaVelocity);
    }
  });
  test('zero crossing changes direction and slowing to speeding',()=> {
    close(valueAt(model,9.6,1),0); assert.equal(stateAt(model,9.6).direction,'Stationary');
    assert.equal(stateAt(model,9.5).motionState,'Slowing down'); assert.equal(stateAt(model,9.7).motionState,'Speeding up');
    assert.equal(stateAt(model,15).motionState,'Slowing down');
  });
  test('distance 262 m and net displacement 10 m',()=> {
    close(stateAt(model,18).distance,262); close(stateAt(model,18).displacement,10);
    close(interval(model,4,8).displacement,80); close(interval(model,8,12).deltaVelocity,-50);
  });
}
test('required worked example: average velocity = 12',()=>close(example.average(0,10),12));
test('required worked example: instantaneous velocity = 15',()=>close(example.velocity(5),15));
test('required worked example: acceleration = 1.2',()=>close(example.acceleration(5),1.2));
test('challenge feedback accepts correct answers and rejects simplistic claims',()=> {
  assert.equal(challenges[model.id].length,8);
  for(const [,answer] of challenges[model.id]) { assert.ok(correctAnswer(answer,answer)); assert.ok(!correctAnswer('',answer)); }
  assert.ok(!correctAnswer('negative acceleration means deceleration','slowing down'));
  assert.ok(correctAnswer('−20','-20')); assert.ok(!correctAnswer('12junk','12'));
});
