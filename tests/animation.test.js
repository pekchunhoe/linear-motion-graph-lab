import test from 'node:test';
import assert from 'node:assert/strict';
import { Timeline } from '../js/shared/animation.js';
function harness() {
  let id=0; const queue=new Map();
  const timeline=new Timeline(30,()=>{},callback=>{queue.set(++id,callback);return id;},key=>queue.delete(key));
  const frame=timestamp=>{const pending=[...queue.values()];queue.clear();pending.forEach(fn=>fn(timestamp));};
  return {timeline,queue,frame};
}
for(const hz of [60,90,120,144]) for(const speed of [0.5,1,2]) {
  test(`${hz} Hz at ${speed}× advances by wall clock`,()=> {
    const {timeline,frame,queue}=harness();timeline.speed=speed;timeline.play();frame(0);
    for(let i=1;i<=hz*5;i++) {frame(i*1000/hz);assert.equal(queue.size,1);}
    assert.ok(Math.abs(timeline.time-5*speed)<1e-8);
  });
}
test('rapid play, stop, reset and restart never duplicate frames',()=> {
  const {timeline,frame,queue}=harness();
  for(let i=0;i<20;i++)timeline.play();assert.equal(queue.size,1);
  frame(0);frame(50);timeline.stop();const stopped=timeline.time;
  frame(10000);assert.equal(timeline.time,stopped);assert.equal(queue.size,0);
  timeline.play();timeline.stop();timeline.play();assert.equal(queue.size,1);
  frame(20000);assert.equal(timeline.time,stopped);frame(20050);assert.ok(timeline.time>stopped);
  timeline.reset();assert.equal(timeline.time,0);assert.equal(queue.size,0);assert.equal(timeline.playing,false);
});
test('end stops exactly and Play restarts',()=> {
  const {timeline,frame,queue}=harness();timeline.seek(29.98);timeline.play();frame(0);frame(50);
  assert.equal(timeline.time,30);assert.equal(timeline.playing,false);assert.equal(queue.size,0);
  timeline.play();assert.equal(timeline.time,0);assert.equal(queue.size,1);
});
test('background gaps capped and scrubbing cancels playback',()=> {
  const {timeline,frame,queue}=harness();timeline.play();frame(0);frame(100000);
  assert.equal(timeline.time,0.1);timeline.seek(13);assert.equal(timeline.time,13);
  assert.equal(timeline.playing,false);assert.equal(queue.size,0);
});
