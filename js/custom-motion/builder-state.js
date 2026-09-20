import { compileCustom, starter, MIN_GAP, MAX_POINTS, MAX_DURATION, valueLimit } from './custom-profile.js';
const copy = value => structuredClone(value);
export class BuilderState {
  constructor(family) {
    this.family = family; this.definition = starter(family); this.model = compileCustom(family, this.definition);
    this.selected = 1; this.snap = true; this.undoStack = []; this.redoStack = []; this.transaction = null;
  }
  begin() { this.transaction ??= copy(this.definition); }
  commit() {
    if (this.transaction && JSON.stringify(this.transaction) !== JSON.stringify(this.definition)) {
      this.undoStack.push(this.transaction); this.undoStack = this.undoStack.slice(-60); this.redoStack = [];
    }
    this.transaction = null;
  }
  apply(definition) {
    const model = compileCustom(this.family, definition); // Preserve last valid model on failure.
    const single = !this.transaction;
    if (single) this.begin();
    this.definition = copy(definition); this.model = model;
    this.selected = Math.min(this.selected, definition.points.length - 1);
    if (single) this.commit();
  }
  move(index, point, constrain = false) {
    const next = copy(this.definition), points = next.points;
    if (constrain) point = { t: index === 0 ? 0 : Math.max(points[index - 1].t + MIN_GAP,
      Math.min(points[index + 1] ? points[index + 1].t - MIN_GAP : MAX_DURATION, point.t)),
      y: Math.max(-valueLimit(this.family), Math.min(valueLimit(this.family), point.y)) };
    points[index] = point; this.apply(next);
  }
  add() {
    const next = copy(this.definition), points = next.points;
    if (points.length >= MAX_POINTS) throw new Error('Maximum 12 points.');
    const i = Math.min(this.selected, points.length - 2), a = points[i], b = points[i + 1];
    if (b.t - a.t < 2 * MIN_GAP) throw new Error('Make room for a point: this segment needs at least 0.5 s.');
    points.splice(i + 1, 0, { t: (a.t + b.t) / 2, y: (a.y + b.y) / 2 });
    this.apply(next); this.selected = i + 1;
  }
  remove() {
    if (this.definition.points.length <= 2) throw new Error('Keep at least two points.');
    const next = copy(this.definition); next.points.splice(this.selected, 1);
    next.points[0].t = 0; this.apply(next);
  }
  reset() { this.apply(starter(this.family)); }
  history(redo = false) {
    this.commit();
    const from = redo ? this.redoStack : this.undoStack, to = redo ? this.undoStack : this.redoStack;
    if (!from.length) return;
    const definition = from.at(-1), model = compileCustom(this.family, definition);
    from.pop(); to.push(copy(this.definition)); this.definition = definition; this.model = model;
    this.selected = Math.min(this.selected, definition.points.length - 1);
  }
}
