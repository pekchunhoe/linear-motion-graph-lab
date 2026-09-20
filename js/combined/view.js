// Reuse uninitialized control markup before mounting a single simulation.
function copySection(selector) {
  const copy = document.querySelector(selector).cloneNode(true);
  for (const node of [copy, ...copy.querySelectorAll('*')]) {
    for (const attr of ['id', 'for', 'aria-controls', 'aria-labelledby', 'aria-describedby']) {
      if (node.hasAttribute(attr)) node.setAttribute(attr, node.getAttribute(attr).replace(/sim[12]-/g, 'sim3-'));
    }
  }
  return copy;
}
export function createCombinedView() {
  const root = document.createElement('section'); root.id = 'sim3'; root.className = 'combined-view';
  root.setAttribute('role', 'tabpanel'); root.setAttribute('aria-labelledby', 'tab3'); root.tabIndex = 0; root.hidden = true;
  root.innerHTML = `<p class="combined-intro">Position-Time · Velocity-Time · Acceleration-Time <span>One time axis, separate quantity scales.</span></p>
    <div class="motion-source" aria-label="Motion source"><span>Motion source</span><button type="button" data-source="preset" aria-pressed="true">Preset graphs</button><button type="button" data-source="custom" aria-pressed="false">Custom graph</button></div>
    <div class="combined-source" hidden><label for="sim3-buildSource">Build from</label><select id="sim3-buildSource"><option value="1">Position-Time</option><option value="2">Velocity-Time</option></select></div>`;
  root.append(copySection('#sim1 .profile-picker'));
  root.querySelector('#sim3-profileBrowser').setAttribute('aria-label', 'Complete motion graph library');
  const controls = document.createElement('div'); controls.dataset.builderControls = ''; root.append(controls);
  const workspace = document.createElement('div'); workspace.className = 'combined-workspace'; root.append(workspace);
  const stack = document.createElement('div'); stack.id = 'sim3-dashboard'; stack.className = 'dashboard combined-stack';
  stack.setAttribute('aria-describedby', 'sim3-graphSummary'); workspace.append(stack);
  stack.append(copySection('#sim1 .graph-card:first-child'), copySection('#sim1 .graph-card:nth-child(2)'), copySection('#sim2 .graph-card:nth-child(2)'));
  const cards = [...stack.children];
  cards[2].querySelector('#sim3-derivedGraph').id = 'sim3-accelerationGraph';
  cards[2].querySelector('#sim3-derivedReadout').id = 'sim3-accelerationReadout';
  cards[2].querySelector('canvas').setAttribute('aria-describedby', 'sim3-keyboardHelp sim3-accelerationReadout');
  cards.forEach((card, order) => {
    card.dataset.order = order;
    const badge = document.createElement('span'); badge.className = 'graph-role'; badge.textContent = 'MODEL';
    card.querySelector('.panel-heading').append(badge);
  });
  cards[1].querySelector('.curve-key').textContent = 'slope → acceleration · area → Δs';
  const side = document.createElement('div'); side.className = 'combined-side'; workspace.append(side);
  side.append(copySection('#sim1 .motion-strip'), copySection('#sim1 .toolbar'), copySection('#sim1 .timeline'), copySection('#sim1-motionDetails'));
  side.querySelector('.compact-values').insertAdjacentHTML('beforeend', '<span>a <output id="sim3-compact-acceleration"></output></span>');
  side.querySelector('#sim3-motionDetails').open = true;
  side.querySelector('#sim3-stopBtn').textContent = 'Ⅱ Pause';
  const drawers = document.createElement('div'); drawers.dataset.builderDetails = ''; side.append(drawers);
  const tools = document.createElement('div'); tools.className = 'learning-grid'; side.append(tools);
  const left = document.createElement('section'), right = document.createElement('section'); tools.append(left, right);
  left.append(copySection('#sim1-predictionActivity'), copySection('#sim1-averagePanel'), copySection('#sim2-areaPanel'));
  left.insertAdjacentHTML('beforeend', `<details id="sim3-linkedInterval"><summary>Compare a time interval on all graphs</summary><label><input id="sim3-highlightMode" type="checkbox"> Highlight the same interval</label><div class="input-row"><label>From (s)<input id="sim3-highlightStart" type="number" min="0" step="0.1" value="0"></label><label>To (s)<input id="sim3-highlightEnd" type="number" min="0" step="0.1" value="5"></label></div><p>Tap or drag any read-only graph to select its motion segment. Edit-point selection highlights the matching segment when this tool is on.</p></details>`);
  right.append(copySection('#sim1-derivedInfo'), copySection('#sim1-challenges'), copySection('#sim1-concepts'));
  right.querySelector('#sim3-derivedInfo summary').textContent = 'Motion relationships and corner notes';
  root.append(copySection('#sim1 .keyboard-panel'));
  root.insertAdjacentHTML('beforeend', '<p id="sim3-graphSummary" class="sr-only"></p>');
  root.querySelector('#sim3-predictBtn').setAttribute('aria-controls', 'sim3-positionCanvas sim3-velocityCanvas sim3-accCanvas');
  document.querySelector('main').append(root);
  return root;
}
