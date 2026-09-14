import { clamp } from './physics-core.js';
// Injectable clock makes refresh rate, cancellation and background gaps testable.
export class Timeline {
  constructor(end, update, request = callback => requestAnimationFrame(callback), cancel = id => cancelAnimationFrame(id)) {
    Object.assign(this, { end, update, request, cancel, time: 0, speed: 1, playing: false, frame: null, previous: null });
  }
  play() {
    if (this.playing) return;
    if (this.time >= this.end) this.time = 0;
    this.playing = true;
    this.previous = null;
    this.update();
    this.frame = this.request(timestamp => this.tick(timestamp));
  }
  tick(timestamp) {
    this.frame = null;
    if (!this.playing) return;
    if (this.previous !== null) this.time = clamp(this.time + Math.max(0, Math.min(0.1, (timestamp - this.previous) / 1000)) * this.speed, this.end);
    this.previous = timestamp;
    if (this.time >= this.end) this.playing = false;
    this.update();
    if (this.playing) this.frame = this.request(next => this.tick(next));
  }
  stop() {
    this.playing = false;
    if (this.frame !== null) this.cancel(this.frame);
    this.frame = null;
    this.previous = null;
    this.update();
  }
  seek(t) { this.stop(); this.time = clamp(t, this.end); this.update(); }
  reset() { this.seek(0); }
}
