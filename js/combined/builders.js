import { createBuilder } from '../custom-motion/builder-ui.js';

export function createCombinedBuilders({ root, graphs, pause, activate, redraw, onSelect }) {
  let custom = false, family = 1;
  const builders = [1, 2].map(family => createBuilder({ root, graph: graphs[family - 1], family,
    pause, activate, redraw, managed: true, onSelect }));
  const current = () => builders[family - 1];
  function selectMode(nextCustom, nextFamily = family) {
    current().finish(); pause(); current().setEnabled(false, false);
    custom = nextCustom; family = nextFamily;
    root.classList.toggle('custom-mode', custom);
    root.querySelector('.profile-picker').hidden = custom;
    root.querySelector('.combined-source').hidden = !custom;
    root.querySelectorAll('.motion-source button').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.source === 'custom') === custom)));
    current().setEnabled(custom, false);
    activate(custom ? current().model : null, false);
  }
  root.querySelector('.motion-source').addEventListener('click', event => {
    if (event.target.dataset.source) selectMode(event.target.dataset.source === 'custom');
  });
  root.querySelector('#sim3-buildSource').addEventListener('change', event => selectMode(true, Number(event.target.value)));
  return {
    get enabled() { return custom; }, get graph() { return current().graph; },
    prepare: () => current().prepare(), draw: () => current().draw(),
    resize: () => current().resize(), finish: () => current().finish(),
    contains: target => builders.some(builder => builder.contains(target)) || !!target.closest('.combined-source,.motion-source')
  };
}
