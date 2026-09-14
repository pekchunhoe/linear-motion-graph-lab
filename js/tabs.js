export function setupTabs(beforeChange, afterChange) {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  let current = 0;
  function activate(index, focus = false) {
    if (index !== current) {
      beforeChange(index);
      current = index;
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = i !== index;
      });
      afterChange();
    }
    if (focus) tabs[index].focus({ preventScroll: true });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i));
    tab.addEventListener('keydown', event => {
      const index = event.key === 'ArrowRight' ? (i + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (index === null) return;
      event.preventDefault();
      activate(index, true);
    });
  });
}
