import test from 'node:test';
import assert from 'node:assert/strict';
import { STVT_PROFILES } from '../js/motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../js/motion-profiles/vtat-profiles.js';
import { valueAt } from '../js/shared/physics-core.js';
import { Graph } from '../js/shared/graph.js';

for (const model of [...Object.values(STVT_PROFILES), ...Object.values(VTAT_PROFILES)]) {
  test(`render: ${model.id}/${model.profileId} exact markers, tangent and bounded coordinates`, () => {
    for (const order of [model.id - 1, model.id]) {
      const calls = [], lines = [], points = [];
      const ctx = new Proxy({}, { get(target, key) {
        return key in target ? target[key] : (...args) => {
          for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${key} has nonfinite coordinate`);
          calls.push([key, ...args]);
        };
      }});
      const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 290, height: 145, left: 0 }), closest: () => null };
      globalThis.window = { devicePixelRatio: 2 };
      const graph = new Graph(canvas, model, order, model.ranges[order]);
      graph.resize();
      graph.line = (...args) => lines.push(args);
      graph.point = (...args) => points.push(args);
      for (const t of [...model.importantTimes, model.end * 0.37]) {
        lines.length = 0; points.length = 0;
        graph.draw(t, { tangent: order === model.id - 1, area: model.id === 2, start: 0 });
        const v = valueAt(model, t, order);
        assert.ok(points.some(p => p[0] === t && p[1] === v && p[2] === '#bd283a'));
        const tangent = lines.find(l => JSON.stringify(l[5]) === '[6,4]');
        if (order === model.id - 1 && valueAt(model, t, order + 1) !== null) {
          assert.ok(tangent);
          const dt = model.end * 0.14;
          assert.equal(tangent[1], graph.y(v - valueAt(model, t, order + 1) * dt));
        } else assert.equal(tangent, undefined);
        if (v !== null) assert.ok(graph.y(v) >= graph.top && graph.y(v) <= graph.bottom);
      }
      const ticks = calls.filter(c => c[0] === 'fillText' && c[2] === graph.left - 8);
      assert.ok(ticks.some(c => c[1] === '0'));
      for (const t of model.discontinuities[order] ?? []) {
        assert.ok(points.some(p => p[0] === t && p[3] === true), 'jump limits have open markers');
      }
    }
  });
}
