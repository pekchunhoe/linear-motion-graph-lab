import { BuilderState } from './builder-state.js';
import { MAX_DURATION, MIN_GAP, valueLimit } from './custom-profile.js';

const letter = i => String.fromCharCode(65 + i);
const number = n => Number(n.toFixed(4));
export function createBuilder({ root, graph, family, pause, activate, redraw, managed = false, onSelect }) {
  const state = new BuilderState(family), prefix = `${root.id}-builder-${managed ? family + '-' : ''}`;
  const unit = family === 1 ? 'm' : 'm/s', quantity = family === 1 ? 'Position' : 'Velocity';
  let enabled = false, drag = null;
  const source = document.createElement('div'); source.className = 'motion-source';
  source.innerHTML = '<span>Motion source</span><button type="button" aria-pressed="true" data-source="preset">Preset graphs</button><button type="button" aria-pressed="false" data-source="custom">Custom graph</button>';
  if (!managed) root.prepend(source);
  const panel = document.createElement('section'); panel.className = 'custom-builder'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Custom Motion Graph Builder');
  panel.innerHTML = `<div class="builder-toolbar">
    <button type="button" data-action="add">+ Add point</button><button type="button" data-action="delete">Delete point</button>
    <button type="button" data-action="undo">Undo</button><button type="button" data-action="redo">Redo</button>
    <label>Segments <select data-control="style"><option value="straight">Straight</option><option value="smooth">Smooth</option></select></label>
    <label><input type="checkbox" data-control="snap" checked> Snap to grid</label><button type="button" data-action="reset">Reset graph</button>
  </div><p class="builder-help">Drag a labelled point to edit; use the timeline to change time. Arrow keys move a focused point; Shift makes larger steps. Editing pauses playback.</p>
  <p data-output="selection"></p><p data-output="error" id="${prefix}error" role="alert"></p>
  <details><summary>Edit points</summary><p>First time stays at 0 s. Last time sets duration (up to 60 s). Keep at least 0.25 s between points. Numeric inputs use exact entered values.</p>
    <table class="point-table"><thead><tr><th scope="col">Point</th><th scope="col">Time (s)</th><th scope="col">${quantity} (${unit})</th></tr></thead><tbody></tbody></table>
    <label>Editable vertical range (±${unit}) <input data-control="limit" type="number" min="${family === 1 ? 25 : 5}" max="${valueLimit(family)}" step="any" value="${family === 1 ? 40 : 20}"></label>
  </details><details><summary>Selected segment equation</summary><code data-output="equation"></code><p>Smooth: shape-preserving cubic Hermite interpolation, with matching first derivatives at joins. Straight: exact linear interpolation.</p></details>
  <p class="builder-summary" data-output="totals"></p><p class="sr-only" id="${prefix}summary" data-output="summary"></p>
  <span class="sr-only" role="status" data-output="announcement"></span>`;
  // Keep both graphs aligned; detailed editing follows the primary graph.
  const card = graph.canvas.closest('.graph-card');
  if (managed) root.querySelector('[data-builder-controls]').append(panel);
  else root.querySelector('.dashboard').before(panel);
  const drawer = document.createElement('section'); drawer.className = 'custom-builder builder-drawer'; drawer.hidden = true;
  drawer.setAttribute('aria-label', 'Custom graph point details');
  for (const element of panel.querySelectorAll('details,[data-output="totals"],[data-output="summary"],[data-output="announcement"]')) drawer.append(element);
  if (managed) root.querySelector('[data-builder-details]').append(drawer);
  else card.append(drawer);
  if (managed && family === 2) panel.insertAdjacentHTML('beforeend', '<label>Initial position s₀ (m)<input data-control="initialPosition" type="number" min="-1000" max="1000" step="any" value="0"></label>');
  const wrapper = document.createElement('div'); wrapper.className = 'editable-graph';
  graph.canvas.before(wrapper); wrapper.append(graph.canvas);
  const nodes = document.createElement('div'); nodes.className = 'graph-nodes'; nodes.hidden = true; wrapper.append(nodes);
  const find = selector => panel.querySelector(selector) ?? drawer.querySelector(selector);
  const output = name => find(`[data-output="${name}"]`);
  const control = name => find(`[data-control="${name}"]`);
  const action = name => find(`[data-action="${name}"]`);
  const presetPicker = root.querySelector('.profile-picker');
  let limit = family === 1 ? 40 : 20;
  const originalDescription = graph.canvas.getAttribute('aria-describedby');
  function announce() { output('announcement').textContent = output('selection').textContent; }
  function edit(operation) {
    pause();
    try {
      operation(); output('error').textContent = '';
      limit = Math.max(limit, ...state.definition.points.map(p => Math.abs(p.y)));
      control('limit').value = limit;
      activate(state.model, true); refresh(); announce();
    } catch (error) { output('error').textContent = error.message; }
  }
  function setEnabled(value, notify = true) {
    finish(); pause(); enabled = value; panel.hidden = !value; drawer.hidden = !value; nodes.hidden = !value;
    if (!managed) { presetPicker.hidden = value; root.classList.toggle('custom-mode', value); }
    for (const button of source.querySelectorAll('button')) button.setAttribute('aria-pressed', String((button.dataset.source === 'custom') === value));
    graph.canvas.setAttribute('aria-describedby', value ? `${originalDescription} ${prefix}summary` : originalDescription);
    root.querySelector(`[id="${root.id}-keyboardHelp"]`).textContent = value
      ? 'Drag a labelled point to edit. Use the timeline or the derived graph to scrub. Focus a point and use arrow keys to edit; Shift increases the step. Tab moves between controls.'
      : 'Drag either graph to scrub and pause. Keyboard: ← → 0.1 s · Shift + arrow 1 s · Home / End · Space play/pause · R reset.';
    if (notify) activate(value ? state.model : null, false);
    refresh();
  }
  source.addEventListener('click', e => { if (e.target.dataset.source) setEnabled(e.target.dataset.source === 'custom'); });
  for (const [name, operation] of Object.entries({ add: () => state.add(), delete: () => state.remove(), undo: () => state.history(), redo: () => state.history(true), reset: () => state.reset() })) {
    action(name).addEventListener('click', () => edit(operation));
  }
  control('style').addEventListener('change', () => edit(() => state.apply({ ...state.definition, style: control('style').value })));
  control('initialPosition')?.addEventListener('change', () => edit(() => state.apply({ ...state.definition, initialPosition: control('initialPosition').valueAsNumber })));
  control('snap').addEventListener('change', () => { state.snap = control('snap').checked; redraw(); refresh(); });
  control('limit').addEventListener('change', () => {
    const value = control('limit').valueAsNumber, minimum = Math.max(family === 1 ? 25 : 5, ...state.definition.points.map(p => Math.abs(p.y)));
    if (!Number.isFinite(value) || value < minimum || value > valueLimit(family)) { output('error').textContent = `Choose a range from ${minimum} to ${valueLimit(family)} ${unit}, including all points.`; return; }
    pause(); limit = value; output('error').textContent = ''; redraw(); refresh();
  });
  function select(i, announceSelection = true) {
    state.selected = i;
    const segment = state.model.primarySegments[Math.min(i, state.model.primarySegments.length - 1)];
    onSelect?.(segment.start, segment.end);
    refresh(); redraw(); if (announceSelection) announce();
  }
  function numericEdit(e) {
    const input = e.target, i = Number(input.dataset.index), field = input.dataset.field;
    if (!field) return;
    edit(() => state.move(i, { ...state.definition.points[i], [field]: input.valueAsNumber }));
    input.setAttribute('aria-invalid', String(!!output('error').textContent));
  }
  drawer.querySelector('tbody').addEventListener('change', numericEdit);
  drawer.querySelector('tbody').addEventListener('focusin', e => {
    if (e.target.dataset.index !== undefined) { pause(); select(Number(e.target.dataset.index)); }
  });
  drawer.querySelector('tbody').addEventListener('click', e => { if (e.target.matches('button')) select(Number(e.target.dataset.index)); });
  function finish(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const previous = drag; drag = null; state.commit();
    if (previous.button.hasPointerCapture(previous.id)) previous.button.releasePointerCapture(previous.id);
    refresh(); announce(); redraw();
  }
  function pointerDown(event, i) {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    event.preventDefault(); pause(); select(i, false); state.begin();
    event.currentTarget.focus({ preventScroll: true });
    const rect = graph.canvas.getBoundingClientRect();
    drag = { id: event.pointerId, button: event.currentTarget, i, end: state.model.end,
      left: rect.left + graph.left, top: rect.top + graph.top, width: graph.right - graph.left, height: graph.bottom - graph.top,
      range: [...graph.range], steps: { ...graph.gridSteps } };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault();
    let t = (event.clientX - drag.left) / drag.width * drag.end;
    let y = drag.range[1] - (event.clientY - drag.top) / drag.height * (drag.range[1] - drag.range[0]);
    if (state.snap) { t = Math.round(t / drag.steps.time) * drag.steps.time; y = Math.round(y / drag.steps.value) * drag.steps.value; }
    y = Math.max(-limit, Math.min(limit, y));
    try { state.move(drag.i, { t: number(t), y: number(y) }, true); activate(state.model, true); refresh(); }
    catch (error) { output('error').textContent = error.message; }
  }
  function keyEdit(event, i) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const p = state.definition.points[i], factor = event.shiftKey ? 5 : 1;
    const dt = (state.snap ? graph.gridSteps.time : 0.1) * factor, dy = (state.snap ? graph.gridSteps.value : 0.1) * factor;
    edit(() => state.move(i, { t: p.t + (event.key === 'ArrowRight' ? dt : event.key === 'ArrowLeft' ? -dt : 0),
      y: p.y + (event.key === 'ArrowUp' ? dy : event.key === 'ArrowDown' ? -dy : 0) }, true));
  }
  function refresh() {
    if (!enabled) return;
    const points = state.definition.points, tbody = drawer.querySelector('tbody');
    if (nodes.children.length !== points.length) {
      nodes.replaceChildren(); tbody.replaceChildren();
      points.forEach((p, i) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'graph-node'; button.dataset.point = i;
        button.addEventListener('focus', () => select(i));
        button.addEventListener('pointerdown', event => pointerDown(event, i));
        button.addEventListener('pointermove', pointerMove);
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, finish);
        button.addEventListener('keydown', event => keyEdit(event, i)); nodes.append(button);
        const row = document.createElement('tr');
        row.innerHTML = `<th scope="row"><button type="button" data-index="${i}">${letter(i)}</button></th><td><input type="number" step="any" min="0" max="${MAX_DURATION}" data-index="${i}" data-field="t" aria-label="Point ${letter(i)} time in seconds" aria-describedby="${prefix}error" ${i === 0 ? 'readonly' : ''}></td><td><input type="number" step="any" min="-${valueLimit(family)}" max="${valueLimit(family)}" data-index="${i}" data-field="y" aria-label="Point ${letter(i)} ${quantity.toLowerCase()} in ${unit}" aria-describedby="${prefix}error"></td>`;
        tbody.append(row);
      });
    }
    points.forEach((p, i) => {
      const selected = state.selected === i, button = nodes.children[i], row = tbody.children[i];
      button.setAttribute('aria-label', `Point ${letter(i)}: ${number(p.t)} seconds, ${number(p.y)} ${unit}. Arrow keys edit.`);
      button.setAttribute('aria-pressed', String(selected)); row.querySelector('button').setAttribute('aria-pressed', String(selected));
      row.classList.toggle('selected', selected);
      for (const field of ['t', 'y']) {
        const input = row.querySelector(`[data-field="${field}"]`);
        // Keep a rejected draft visible so correcting it emits a real change,
        // including when the correction equals the last valid model value.
        if (document.activeElement !== input && input.getAttribute('aria-invalid') !== 'true') input.value = p[field];
        if (!output('error').textContent) input.removeAttribute('aria-invalid');
      }
      const input = row.querySelector('[data-field="t"]');
      input.min = i ? points[i - 1].t + MIN_GAP : 0; input.max = points[i + 1] ? points[i + 1].t - MIN_GAP : MAX_DURATION;
    });
    control('style').value = state.definition.style;
    if (control('initialPosition') && document.activeElement !== control('initialPosition')) control('initialPosition').value = state.definition.initialPosition ?? 0;
    action('undo').disabled = !state.undoStack.length; action('redo').disabled = !state.redoStack.length;
    action('add').disabled = points.length >= 12; action('delete').disabled = points.length <= 2;
    const p = points[state.selected], sIndex = Math.min(state.selected, points.length - 2), s = state.model.primarySegments[sIndex];
    output('selection').textContent = `Selected ${letter(state.selected)}: ${number(p.t)} s, ${number(p.y)} ${unit}. ${state.snap ? `Snap to minor ticks: ${graph.gridSteps?.time ?? 1} s, ${graph.gridSteps?.value ?? 1} ${unit} (¼ of labelled grid).` : 'Fine movement; snap off.'}`;
    output('equation').textContent = `${letter(sIndex)}${letter(sIndex + 1)}: ${family === 1 ? 's' : 'v'}(t) = ${s.c.map((c, i) => `${i ? (c < 0 ? ' − ' : ' + ') : c < 0 ? '−' : ''}${number(Math.abs(c))}${i ? `u${i > 1 ? '^' + i : ''}` : ''}`).join('')}; u = t − ${number(s.start)}, ${number(s.start)} ≤ t ≤ ${number(s.end)} s. Coefficients displayed to 4 decimals.`;
    output('totals').textContent = `${points.length} points · ${points.length - 1} segments · ${number(state.model.end)} s · Distance ${number(state.model.distanceAt(state.model.end))} m · Displacement ${number(state.model.displacementAt(state.model.end))} m`;
    output('summary').textContent = `Custom ${quantity.toLowerCase()}-time graph with ${points.length} points. ` + points.map((p, i) => `${letter(i)}: ${number(p.t)} seconds, ${number(p.y)} ${unit}.`).join(' ');
    draw();
  }
  function draw() {
    if (!enabled || !graph.width) return;
    const c = graph.ctx;
    state.definition.points.forEach((p, i) => {
      const x = graph.x(p.t), y = graph.y(p.y), selected = i === state.selected;
      graph.point(p.t, p.y, '#163c4b', true, selected ? 8 : 6);
      if (selected) graph.point(p.t, p.y, '#163c4b', false, 3);
      c.fillStyle = '#163c4b'; c.font = 'bold 12px system-ui'; c.textAlign = 'center';
      c.fillText(letter(i), Math.min(graph.width - 10, Math.max(10, x)), Math.max(12, y - 16));
      const button = nodes.children[i]; if (button) { button.style.left = `${x}px`; button.style.top = `${y}px`; }
    });
  }
  return { graph, setEnabled, get model() { return state.model; }, get enabled() { return enabled; }, get range() { return [-limit * 1.1, limit * 1.1]; }, draw,
    finish, resize: refresh, contains: target => panel.contains(target) || drawer.contains(target) || nodes.contains(target) || source.contains(target),
    prepare: () => { if (enabled) graph.range = drag ? drag.range : [-limit * 1.1, limit * 1.1]; } };
}
