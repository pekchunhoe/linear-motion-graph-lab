import { interval } from '../shared/physics-core.js';

export function accelerationAreaMessage(model, start, end, fmt) {
  const area = interval(model, start, end);
  if (model.discontinuities[1].some(t => t >= start && t <= end)) {
    return 'This interval includes an instantaneous velocity change. Acceleration is undefined at the jump; the finite acceleration area alone cannot account for it. Choose an interval without a velocity jump to use ∫a dt = Δv.';
  }
  return `Δv = ∫a dt = ${fmt(area.deltaVelocity, 'm s⁻¹')}. v_final = v_initial + Δv: ${fmt(area.finalVelocity)} = ${fmt(area.initialVelocity)} + (${fmt(area.deltaVelocity)}) m s⁻¹. Undefined acceleration at isolated corners with continuous velocity does not change the area.`;
}

export function setupPrediction(root, redraw) {
  const button = root.querySelector('#sim3-predictBtn');
  const prompt = root.querySelector('#sim3-predictionPrompt');
  const cards = [...root.querySelectorAll('.graph-card')];
  const names = ['Position', 'Velocity', 'Acceleration'];
  let source = 0, stage = 0;
  const placeholders = cards.map(card => {
    const placeholder = document.createElement('p'); placeholder.className = 'graph-prediction'; placeholder.hidden = true;
    card.append(placeholder); return placeholder;
  });
  function update() {
    const targets = source === 0 ? [1, 2] : [0, 2];
    cards.forEach((card, order) => {
      const hidden = stage > 0 && targets.slice(stage - 1).includes(order);
      // Keep each card in the stack while removing the answer from sight and focus.
      for (const node of card.children) {
        if (!node.matches('.panel-heading,.graph-prediction')) node.hidden = hidden;
      }
      placeholders[order].hidden = !hidden;
      placeholders[order].textContent = `Predict the ${names[order].toLowerCase()} graph.`;
    });
    prompt.hidden = stage === 0;
    prompt.querySelector('p').textContent = source === 0
      ? 'Use position slopes to predict velocity, then velocity slopes to predict acceleration.'
      : 'Use signed velocity area and the initial position to predict position; use velocity slopes to predict acceleration.';
    button.textContent = stage === 0 ? `Predict → hide ${names[targets[0]].toLowerCase()} and acceleration` : `Reveal ${names[targets[stage - 1]]}`;
    button.setAttribute('aria-expanded', String(stage === 0));
  }
  button.addEventListener('click', () => { stage = (stage + 1) % 3; update(); redraw(); });
  return { setSource(order) { if (order !== source) stage = 0; source = order; update(); } };
}
