import test from 'node:test';
import assert from 'node:assert/strict';
import { model, valueAt } from '../js/st-vt/physics.js';
import { Graph } from '../js/shared/graph.js';
function graph(order,range) {
  const fills=[];let arc=null;
  const context=new Proxy({fill(){if(arc)fills.push({arc,color:this.fillStyle});},beginPath(){arc=null;},arc(...args){arc=args;}},{get(target,key){return key in target?target[key]:()=>{};}});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:270,left:0}),closest:()=>null};
  globalThis.window={devicePixelRatio:2};
  const instance=new Graph(canvas,model,order,range);instance.resize();
  const lines=[];instance.line=(...args)=>lines.push(args);
  return {instance,lines,fills,canvas};
}
test('current markers and guides map to the same time and exact model values',()=>{
  const order=model.id===1?0:1,t=model.id===1?7:11;
  for(const o of [order,order+1]) {
    const {instance:g,lines,fills,canvas}=graph(o,[-150,150]);g.draw(t,{tangent:o===order});
    const point=fills.filter(f=>f.color==='#bd283a').at(-1);
    assert.equal(point.arc[0],g.x(t));assert.equal(point.arc[1],g.y(valueAt(model,t,o)));
    const guide=lines.find(l=>JSON.stringify(l[5])==='[3,4]');assert.equal(guide[0],g.x(t));assert.equal(guide[2],g.x(t));
    assert.equal(canvas.width,640);assert.equal(canvas.height,540);
  }
});
test('no false tangent or filled derivative marker at a corner',()=>{
  const order=model.id===1?0:1,t=model.id===1?15:8;
  const primary=graph(order,[-150,150]);primary.instance.draw(t,{tangent:true});
  assert.ok(!primary.lines.some(l=>JSON.stringify(l[5])==='[6,4]'));
  const derived=graph(order+1,[-30,30]);derived.instance.draw(t);
  assert.equal(derived.fills.filter(f=>f.color==='#bd283a').length,0);
  assert.ok(derived.fills.filter(f=>f.color==='#fff').length>=2);
});
test('smooth tangent uses the analytic slope',()=>{
  const order=model.id===1?0:1,t=model.id===1?7:11;
  const {instance:g,lines}=graph(order,[-150,150]);g.draw(t,{tangent:true});
  const line=lines.find(l=>JSON.stringify(l[5])==='[6,4]');
  const dt=model.end*0.14,slope=valueAt(model,t,order+1),value=valueAt(model,t,order);
  assert.equal(line[1],g.y(value-slope*dt));assert.equal(line[3],g.y(value+slope*dt));
});
