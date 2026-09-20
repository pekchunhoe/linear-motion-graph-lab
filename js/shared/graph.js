import { valueAt, segmentValue, limitsAt, rootsAt } from './physics-core.js';
export const colors = ['#2454b8', '#087b65', '#8540a3'];
const units = ['s (m)', 'v (m s⁻¹)', 'a (m s⁻²)'];
export function niceStep(range, count) {
  const raw = range / count, power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].find(n => n * power >= raw) * power;
}
export class Graph {
  constructor(canvas, model, order, range) {
    Object.assign(this, { canvas, model, order, range, ctx: canvas.getContext('2d') });
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    Object.assign(this, { width, height, left: 49, right: width - 20, top: 30, bottom: height - 43 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(this.canvas.width / width, 0, 0, this.canvas.height / height, 0, 0);
  }
  x(t) { const axis = this.timeAxis; return axis ? axis.left + (t - axis.min) / (axis.max - axis.min) * (axis.right - axis.left) : this.left + t / this.model.end * (this.right - this.left); }
  y(value) { return this.bottom - (value - this.range[0]) / (this.range[1] - this.range[0]) * (this.bottom - this.top); }
  timeAt(clientX) {
    return (clientX - this.canvas.getBoundingClientRect().left - this.left) / (this.right - this.left) * this.model.end;
  }
  line(x1, y1, x2, y2, color, dash = [], width = 1) {
    const c = this.ctx;
    c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
  }
  point(t, value, color, open = false, radius = 4) {
    if (value === null) return;
    const c = this.ctx;
    c.beginPath(); c.arc(this.x(t), this.y(value), radius, 0, Math.PI * 2);
    c.fillStyle = open ? '#fff' : color; c.fill(); c.strokeStyle = color; c.lineWidth = 2; c.stroke();
  }
  shade(start, end, absolute) {
    if (end <= start) return;
    const c = this.ctx;
    for (const s of this.model.segments) {
      const lo = Math.max(start, s.start), hi = Math.min(end, s.end);
      if (hi <= lo) continue;
      const cuts = [lo, ...rootsAt(s, this.order).filter(t => t > lo && t < hi), hi];
      for (let i = 1; i < cuts.length; i++) {
        const a = cuts[i - 1], b = cuts[i], negative = segmentValue(s, (a + b) / 2, this.order) < 0;
        c.beginPath(); c.moveTo(this.x(a), this.y(0));
        for (let j = 0; j <= 40; j++) {
          const t = a + (b - a) * j / 40, value = segmentValue(s, t, this.order);
          c.lineTo(this.x(t), this.y(absolute ? Math.abs(value) : value));
        }
        c.lineTo(this.x(b), this.y(0)); c.closePath();
        c.fillStyle = negative ? '#edc896' : '#b6e0d4'; c.fill();
        if (negative) {
          c.save(); c.clip();
          for (let x = this.left - this.height; x < this.right + this.height; x += 9) this.line(x, this.bottom, x + this.height, this.top, '#966329');
          c.restore();
        }
      }
    }
  }
  draw(t, options = {}) {
    if (!this.width || this.canvas.hidden || this.canvas.closest('[hidden]')) return;
    const c = this.ctx;
    c.clearRect(0, 0, this.width, this.height);
    c.font = `${this.width > 550 ? 13 : 12}px system-ui`; c.fillStyle = '#334155';
    c.textBaseline = 'middle'; c.textAlign = 'right';
    const stepY = niceStep(this.range[1] - this.range[0], Math.max(4, (this.bottom - this.top) / 32));
    for (let v = Math.ceil(this.range[0] / stepY) * stepY; v <= this.range[1]; v += stepY) {
      this.line(this.left, this.y(v), this.right, this.y(v), '#e3e9ef');
      c.fillText(String(Number(v.toFixed(2))), this.left - 8, this.y(v));
    }
    const stepT = this.timeAxis?.step ?? niceStep(this.model.end, (this.right - this.left) / 40);
    this.gridSteps = { time: stepT / (options.editGrid ? 4 : 1), value: stepY / (options.editGrid ? 4 : 1) };
    if (options.editGrid) {
      // Visible minor ticks divide each labelled interval into four snap steps.
      for (let v = Math.ceil(this.range[0] / this.gridSteps.value) * this.gridSteps.value; v <= this.range[1]; v += this.gridSteps.value)
        this.line(this.left, this.y(v), this.left + 4, this.y(v), '#8c9daa');
      for (let time = 0; time <= this.model.end; time += this.gridSteps.time)
        this.line(this.x(time), this.bottom, this.x(time), this.bottom - 4, '#8c9daa');
    }
    c.textAlign = 'center';
    for (let time = 0; time <= this.model.end; time += stepT) {
      this.line(this.x(time), this.top, this.x(time), this.bottom, '#e3e9ef');
      if (time === this.model.end || this.right - this.x(time) >= 24) c.fillText(String(time), this.x(time), this.bottom + 15);
    }
    if (this.model.end % stepT) c.fillText(String(this.model.end), this.right, this.bottom + 15);
    this.line(this.left, this.y(0), this.right + 5, this.y(0), '#59697c', [], 1.5);
    this.line(this.left, this.bottom, this.left, this.top - 5, '#59697c', [], 1.5);
    this.line(this.right + 5, this.y(0), this.right, this.y(0) - 4, '#59697c');
    this.line(this.right + 5, this.y(0), this.right, this.y(0) + 4, '#59697c');
    c.textAlign = 'left'; c.fillText(units[this.order], 5, 12);
    c.textAlign = 'right'; c.fillText('t (s)', this.width - 5, this.height - 8);
    // Clip teaching overlays to the plotting rectangle, preserving axes and units.
    c.save(); c.beginPath(); c.rect(this.left - 6, this.top - 6, this.right - this.left + 12, this.bottom - this.top + 12); c.clip();
    if (options.highlight) {
      const [a, b] = options.highlight;
      c.fillStyle = '#2454b812'; c.fillRect(this.x(Math.min(a,b)), this.top, Math.abs(this.x(b)-this.x(a)), this.bottom-this.top);
    }
    if (options.area) this.shade(options.start, t, options.absolute);
    for (const s of this.model.segments) {
      c.beginPath(); c.strokeStyle = colors[this.order]; c.lineWidth = 2.5;
      for (let i = 0; i <= 80; i++) {
        const time = s.start + (s.end - s.start) * i / 80, v = segmentValue(s, time, this.order);
        if (i === 0) c.moveTo(this.x(time), this.y(v)); else c.lineTo(this.x(time), this.y(v));
      }
      c.stroke();
    }
    // Each side of an undefined derivative is open, with no vertical joining line.
    for (const s of this.model.segments.slice(1)) {
      if (valueAt(this.model, s.start, this.order) === null) {
        for (const v of limitsAt(this.model, s.start, this.order)) this.point(s.start, v, colors[this.order], true);
      }
    }
    this.line(this.x(t), this.top, this.x(t), this.bottom, '#7c3940', [3, 4]);
    const value = valueAt(this.model, t, this.order);
    if (options.tangent) {
      const slope = valueAt(this.model, t, this.order + 1);
      if (slope !== null && value !== null) {
        const dt = this.model.end * 0.14;
        this.line(this.x(t - dt), this.y(value - slope * dt), this.x(t + dt), this.y(value + slope * dt), '#bd283a', [6, 4], 2);
      }
    }
    if (options.average) {
      const [a, b] = options.average, va = valueAt(this.model, a, this.order), vb = valueAt(this.model, b, this.order);
      if (va !== null && vb !== null) {
        this.line(this.x(a), this.y(va), this.x(b), this.y(vb), '#8540a3', [9, 3, 2, 3], 2.5);
        this.point(a, va, '#8540a3', false, 5); this.point(b, vb, '#8540a3', false, 5);
      }
    }
    this.point(t, value, '#bd283a', false, 5);
    c.restore();
  }
}
