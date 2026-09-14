import test from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../js/shared/graph.js';
import { model as position } from '../js/st-vt/physics.js';
import { model as velocity } from '../js/vt-at/physics.js';

function chart(model, order, range) {
  const labels = [], lines = [];
  const ctx = new Proxy({fillText(text,x,y) { labels.push({text,x,y}); }}, {get(target,key) { return key in target ? target[key] : () => {}; }});
  const canvas = {getContext:()=>ctx, getBoundingClientRect:()=>({width:290,height:145,left:0}), closest:()=>null};
  globalThis.window = {devicePixelRatio:4};
  const graph = new Graph(canvas,model,order,range);
  graph.resize();
  graph.line = (...args) => lines.push(args);
  return {graph,canvas,labels,lines};
}
for (const [model,order,range] of [[position,0,[-120,120]],[position,1,[-25,25]],[velocity,1,[-35,35]],[velocity,2,[-15,10]]]) {
  test(`small chart ${model.id}/${order} retains signed vertical ticks and bounded DPI`, () => {
    const {graph,canvas,labels} = chart(model,order,range);
    graph.draw(3);
    const ticks = labels.filter(l=>l.x===graph.left-8).map(l=>Number(l.text));
    assert.ok(ticks.some(t=>t<0));
    assert.ok(ticks.some(t=>t>0));
    assert.ok(ticks.includes(0));
    assert.equal(canvas.width,580);
    assert.equal(canvas.height,290);
    const times = labels.filter(l=>l.y===graph.bottom+15);
    for (let i=1;i<times.length;i++) assert.ok(times[i].x-times[i-1].x>=24);
    assert.equal(times.at(-1).text,String(model.end));
  });
}
test('acceleration secant joins velocity values, with the slope Δv/Δt', () => {
  const {graph,lines} = chart(velocity,1,[-35,35]);
  graph.draw(12,{average:[8,12]});
  const secant = lines.find(l=>JSON.stringify(l[5])==='[9,3,2,3]');
  assert.deepEqual(secant.slice(0,4),[graph.x(8),graph.y(20),graph.x(12),graph.y(-30)]);
  assert.equal((-30-20)/(12-8),-12.5);
});
