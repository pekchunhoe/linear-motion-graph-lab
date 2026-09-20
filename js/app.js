import { STVT_PROFILES } from './motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from './motion-profiles/vtat-profiles.js';
import { createSimulation } from './simulation.js';
import { setupTabs } from './tabs.js';
import { COMBINED_PROFILES } from './combined/profiles.js';
import { createCombinedView } from './combined/view.js';

createCombinedView();
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
const simulations = panels.map((panel, i) => createSimulation(panel, [STVT_PROFILES, VTAT_PROFILES, COMBINED_PROFILES][i], { combined: i === 2 }));
let active = 0;
setupTabs(index => {
  simulations[active].pause();
  active = index;
}, () => simulations[active].resize());

// One owner for global input and resizing; hidden simulations never animate.
document.addEventListener('keydown', event => {
  if (!event.target.closest('[role="tablist"]')) simulations[active].onKeydown(event);
});
window.addEventListener('blur', () => simulations[active].pause());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) simulations[active].pause();
});
let resizeFrame = null;
function scheduleResize() {
  if (resizeFrame !== null) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    simulations[active].resize();
  });
}
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleResize);
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(scheduleResize);
  document.querySelectorAll('canvas,.road').forEach(element => observer.observe(element));
}
simulations[active].resize();
