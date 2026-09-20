import test from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../js/shared/graph.js';
import { alignTimeAxes } from '../js/shared/time-axis.js';
import { COMBINED_PROFILES } from '../js/combined/profiles.js';
for (const width of [290,360,720]) test(`shared time geometry at ${width}px including wide signed labels`, () => {
  const model=COMBINED_PROFILES.original;
  globalThis.window={devicePixelRatio:2};
  const graphs=[0,1,2].map(order=> {
    const context={setTransform(){},measureText:text=>({width:text.length*8})};
    const canvas={getContext:()=>context,getBoundingClientRect:()=>({width,height:180,left:12}),closest:()=>null};
    const graph=new Graph(canvas,model,order,order===0?[-10000,10000]:model.ranges[order]);graph.resize();return graph;
  });
  const axis=alignTimeAxes(graphs);
  assert.ok(axis.left>=60);
  for(const t of [0,1.234,model.end/2,model.end]) {
    for(const graph of graphs) {
      assert.equal(graph.timeAxis,axis);assert.equal(graph.x(t),graphs[0].x(t));
      assert.ok(Math.abs(graph.timeAt(graph.x(t)+12)-t)<1e-10);
    }
  }
  assert.notDeepEqual(graphs[0].range,graphs[1].range);
});
