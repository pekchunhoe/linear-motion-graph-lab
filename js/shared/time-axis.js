import { niceStep } from './graph.js';

export function alignTimeAxes(graphs) {
  const visible = graphs.find(graph => graph.width && !graph.canvas.closest('[hidden]'));
  if (!visible) return;
  let widest = 0;
  for (const graph of graphs) {
    graph.ctx.font = `${visible.width > 550 ? 13 : 12}px system-ui`;
    const step = niceStep(graph.range[1] - graph.range[0], Math.max(4, (graph.bottom - graph.top) / 32));
    for (let y = Math.ceil(graph.range[0] / step) * step; y <= graph.range[1]; y += step) {
      widest = Math.max(widest, graph.ctx.measureText(String(Number(y.toFixed(2)))).width);
    }
  }
  const left = Math.max(49, Math.ceil(widest + 12)), right = visible.width - 20;
  const axis = { left, right, min: 0, max: visible.model.end, step: niceStep(visible.model.end, (right - left) / 40) };
  for (const graph of graphs) { graph.timeAxis = axis; graph.left = left; graph.right = right; }
  return axis;
}
