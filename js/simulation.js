import { stateAt, valueAt, limitsAt, interval, facingAt } from './shared/physics-core.js';
import { Timeline } from './shared/animation.js';
import { Graph } from './shared/graph.js';
import { setupActivities } from './shared/activities.js';
import { createProfileBrowser, groupProfiles } from './shared/profile-browser.js';
import { createBuilder } from './custom-motion/builder-ui.js';
export function createSimulation(root, profiles) {
let model = profiles.original ?? Object.values(profiles)[0];
const prefix = root.id + '-';
const $ = id => root.querySelector('#' + prefix + id);
const fmt = (v, unit = '') => v === null ? 'Undefined' : `${Math.abs(v) < 1e-8 ? '0.00' : v.toFixed(2)}${unit ? ` ${unit}` : ''}`;
const isPosition = model.id === 1;
const primary = new Graph($(isPosition ? 'positionCanvas' : 'velocityCanvas'), model, isPosition ? 0 : 1, model.ranges[isPosition ? 0 : 1]);
const derived = new Graph($(isPosition ? 'velocityCanvas' : 'accCanvas'), model, isPosition ? 1 : 2, model.ranges[isPosition ? 1 : 2]);
const graphs = [primary, derived];
let predictionHidden = false;
let builder;
const fields = [['t','Time t','s'],['position','Position s','m'],['velocity','Velocity v','m s⁻¹'],['speed','Speed |v|','m s⁻¹'],['acceleration','Acceleration a','m s⁻²'],['displacement','Displacement Δs','m'],['distance','Distance travelled','m'],['direction','Direction',''],['motionState','Motion state','']];
$('liveState').innerHTML = fields.map(([key,label]) => `<div${key === 'motionState' ? ' class="wide"' : ''}><dt>${label}</dt><dd id="${prefix}live-${key}"></dd></div>`).join('');
$('roadMarks').innerHTML = model.roadTicks.map(n => `<span class="mark" data-position="${n}">${n}</span>`).join('');
const timeline = new Timeline(model.end, render);
function numeric(id, fallback) {
  const number = $(id).valueAsNumber;
  return Number.isFinite(number) ? Math.max(0, Math.min(model.end, number)) : fallback;
}
function cornerText(t, order) {
  if (order === 2 && valueAt(model,t,1) === null) return 'Acceleration is undefined at this idealised velocity jump. The finite acceleration on neighbouring intervals cannot describe the instantaneous change; an impulse would be required.';
  const limits = limitsAt(model, t, order);
  return `Instantaneous ${order === 1 ? 'velocity' : 'acceleration'} is undefined exactly at this idealised corner because the slope changes abruptly.${limits ? ` Left: ${fmt(limits[0])}; right: ${fmt(limits[1])} ${order === 1 ? 'm s⁻¹' : 'm s⁻²'}.` : ''}`;
}
function explanation(state) {
  if (state.velocity === null) return cornerText(state.t, 1);
  if (state.acceleration === null) return `${state.direction}. ${cornerText(state.t, 2)}`;
  const moving = `${state.direction}; ${state.motionState.toLowerCase()}.`;
  const meaning = state.velocity === 0
    ? state.acceleration === 0 ? 'The position graph is horizontal and velocity is zero.' : 'Velocity is zero at this instant. Nonzero acceleration means this is not a stationary interval.'
    : isPosition
      ? `The position graph ${state.velocity > 0 ? 'rises' : 'falls'}; its steepness ${state.acceleration === 0 ? 'is constant' : state.velocity * state.acceleration > 0 ? 'increases' : 'decreases'}.`
      : `Velocity is ${state.velocity > 0 ? 'positive' : 'negative'} and acceleration is ${state.acceleration === 0 ? 'zero' : state.acceleration > 0 ? 'positive' : 'negative'}. ${state.acceleration === 0 ? 'The velocity graph is horizontal.' : state.velocity * state.acceleration > 0 ? 'Matching signs mean increasing speed.' : 'Opposite signs mean decreasing speed.'}`;
  return `At t = ${fmt(state.t, 's')}: ${moving} ${meaning}`;
}
function render() {
  const state = stateAt(model, timeline.time), t = state.t;
  $('timeReadout').textContent = fmt(t, 's');
  $('timeScrubber').value = t;
  $('timeScrubber').setAttribute('aria-valuetext', fmt(t, 'seconds'));
  const status = timeline.playing ? 'Playing' : t === model.end ? 'Complete' : 'Paused';
  if ($('playbackStatus').textContent !== status) $('playbackStatus').textContent = status;
  $('playBtn').setAttribute('aria-pressed', String(timeline.playing));
  for (const [key,,unit] of fields) $('live-' + key).textContent = typeof state[key] === 'string' ? state[key] : fmt(state[key], unit);
  for (const key of isPosition ? ['t','position','velocity'] : ['t','velocity','acceleration']) {
    $('compact-' + key).textContent = fmt(state[key], key === 't' ? 's' : key === 'position' ? 'm' : key === 'velocity' ? 'm/s' : 'm/s²');
  }
  $('segmentExplanation').textContent = explanation(state);
  $('endpointNote').textContent = t === 0 || t === model.end ? 'Endpoint derivative values use the one-sided motion within the displayed time interval.' : '';
  const roadWidth = root.querySelector('.road').clientWidth, carWidth = $('carSVG').getBoundingClientRect().width;
  const padding = carWidth / 2 + 5;
  const roadX = position => padding + (position - model.road[0]) / (model.road[1] - model.road[0]) * (roadWidth - 2 * padding);
  $('carContainer').style.left = `${roadX(state.position)}px`;
  // No unique direction at a velocity jump: mute the car and explicitly label the state.
  // At rest use the incoming direction (or outgoing direction at t=0), even
  // after a direct seek. This is deterministic and avoids orientation jitter.
  $('carSVG').style.transform = facingAt(model, t) < 0 ? 'scaleX(-1)' : 'scaleX(1)';
  $('carSVG').style.opacity = state.velocity === null ? '0.4' : '1';
  root.querySelector('.road').setAttribute('aria-label', `Car position ${fmt(state.position, 'metres')}; ${state.direction.toLowerCase()}`);
  root.querySelectorAll('.mark').forEach(mark => { mark.style.left = `${roadX(Number(mark.dataset.position))}px`; });
  const order = isPosition ? 1 : 2, derivative = valueAt(model, t, order);
  $('primaryReadout').textContent = derivative === null ? `Slope → ${isPosition ? 'velocity' : 'acceleration'} undefined at corner` : `Slope = ${isPosition ? 'v = ds/dt' : 'a = dv/dt'} = ${fmt(derivative, isPosition ? 'm s⁻¹' : 'm s⁻²')}`;
  $('derivedReadout').textContent = derivative === null ? '○ Open circles: derivative undefined here.' : `Graph value = ${fmt(derivative, isPosition ? 'm s⁻¹' : 'm s⁻²')} · same time, same slope`;
  const pOptions = { tangent: true }, dOptions = {};
  if (isPosition) {
    const a = numeric('t1',0), b = numeric('t2',10), result = interval(model,a,b);
    const valid = $('t1').value !== '' && $('t2').value !== '' && a !== b;
    $('averageResult').textContent = valid ? `Δs = s₂ − s₁ = ${fmt(result.displacement,'m')}; Δt = t₂ − t₁ = ${fmt(result.deltaTime,'s')}; v_avg = Δs/Δt = ${fmt(result.averageVelocity,'m s⁻¹')}.` : 'Choose two different times to define a secant and average velocity.';
    if ($('averageMode').checked && valid) pOptions.average = [a,b];
    $('optionalReadout').textContent = state.acceleration === null ? cornerText(t,2) : `Current a = ${fmt(state.acceleration,'m s⁻²')}. On each smooth interval a is the rate of change of velocity.`;
  } else {
    const start = numeric('areaStart',0), absolute = $('areaMode').value === 'distance', valid = start <= t;
    // Reflected negative area must fit above zero, including all-negative profiles.
    primary.range = absolute ? [model.ranges[1][0], Math.max(model.ranges[1][1], -model.ranges[1][0])] : model.ranges[1];
    const area = interval(model,start,t);
    Object.assign(pOptions,{area:$('velocityArea').checked && valid,start,absolute});
    Object.assign(dOptions,{area:$('accelerationArea').checked && valid,start});
    const averageAcceleration = area.deltaTime === 0 ? null : area.deltaVelocity / area.deltaTime;
    $('averageAccelerationResult').textContent = valid && averageAcceleration !== null ? `Average a = Δv/Δt = ${fmt(averageAcceleration,'m s⁻²')}; tangent = instantaneous a.` : 'Choose an earlier start for average acceleration.';
    if ($('averageAcceleration').checked && valid && area.deltaTime > 0) pOptions.average = [start,t];
    const positive = (area.distance + area.displacement)/2, negative = (area.displacement - area.distance)/2;
    $('velocityAreaResult').textContent = valid ? `${fmt(start,'s')} → ${fmt(t,'s')}: ${absolute ? 'distance = ∫|v| dt' : 'Δs = ∫v dt'} = ${fmt(absolute ? area.distance : area.displacement,'m')}. Positive contribution +${fmt(positive,'m')}; negative contribution ${fmt(negative,'m')}. Net Δs = ${fmt(area.displacement,'m')}; distance = ${fmt(area.distance,'m')}.` : 'Starting time is later than current time. Scrub forward or choose an earlier start to shade an interval.';
    $('accelerationAreaResult').textContent = valid ? `Δv = ∫a dt = ${fmt(area.deltaVelocity,'m s⁻¹')}. v_final = v_initial + Δv: ${fmt(area.finalVelocity)} = ${fmt(area.initialVelocity)} + (${fmt(area.deltaVelocity)}) m s⁻¹. Undefined acceleration at isolated corners does not change the area.` : 'Choose a starting time at or before the current time.';
    $('optionalReadout').textContent = `s = ${fmt(state.position,'m')}; displacement from the starting position = ${fmt(state.displacement,'m')}; accumulated distance = ${fmt(state.distance,'m')}. s(t) = s(0) + ∫₀ᵗ v dt.`;
  }
  builder?.prepare();
  pOptions.editGrid = !!builder?.enabled;
  primary.draw(t,pOptions); derived.draw(t,dOptions); builder?.draw();
}
$('playBtn').addEventListener('click',() => timeline.play());
$('stopBtn').addEventListener('click',() => timeline.stop());
$('resetBtn').addEventListener('click',() => timeline.reset());
$('playbackSpeed').addEventListener('change',e => { timeline.speed = Number(e.target.value); });
$('timeScrubber').addEventListener('input',e => timeline.seek(Number(e.target.value)));
for (const id of isPosition ? ['averageMode','t1','t2'] : ['areaStart','velocityArea','accelerationArea','areaMode','averageAcceleration']) {
  $(id).addEventListener('input',render);
  if ($(id).type === 'number') $(id).addEventListener('change',() => { $(id).value = numeric(id,0); render(); });
}
$('predictBtn').addEventListener('click',() => {
  predictionHidden = !predictionHidden;
  $('derivedGraph').hidden = predictionHidden;
  $('predictionPrompt').hidden = !predictionHidden;
  $('predictBtn').textContent = predictionHidden ? `Reveal ${isPosition ? 'Velocity' : 'Acceleration'} Graph` : `Predict → hide ${isPosition ? 'velocity' : 'acceleration'} graph`;
  $('predictBtn').setAttribute('aria-expanded',String(!predictionHidden)); resize();
});

// One active pointer across both graphs; horizontal scrubbing pauses consistently.
let active = null;
for (const graph of graphs) {
  const canvas = graph.canvas, move = event => timeline.seek(graph.timeAt(event.clientX));
  canvas.addEventListener('pointerdown',event => {
    if (graph === primary && builder?.enabled) return;
    if (!event.isPrimary || event.button !== 0 || active !== null) return;
    active = {id:event.pointerId,canvas}; canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId); move(event);
  });
  canvas.addEventListener('pointermove',event => {
    if (active?.canvas === canvas && active.id === event.pointerId) { event.preventDefault(); move(event); }
  });
  const finish = event => {
    if (active?.canvas !== canvas || active.id !== event.pointerId) return;
    active = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,finish);
}
function pause() {
  builder?.finish();
  if (active) { const {canvas,id} = active; active = null; if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); }
  timeline.stop();
}
function onKeydown(event) {
  if (event.defaultPrevented || builder?.contains(event.target)) return;
  if (event.target.closest('input,select,textarea,[contenteditable="true"]') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === ' ' && event.target.closest('button,summary,a')) return;
  const step = event.shiftKey ? 1 : 0.1;
  if (event.key === 'ArrowLeft') timeline.seek(timeline.time-step);
  else if (event.key === 'ArrowRight') timeline.seek(timeline.time+step);
  else if (event.key === 'Home') timeline.seek(0);
  else if (event.key === 'End') timeline.seek(model.end);
  else if (event.key.toLowerCase() === 'r') timeline.reset();
  else if (event.key === ' ') timeline.playing ? timeline.stop() : timeline.play();
  else return;
  event.preventDefault();
}
function resize() { graphs.forEach(graph => graph.resize()); render(); profileBrowser?.resize(); builder?.resize(); }
const activities = setupActivities(model, root, prefix);
const groupedProfiles = groupProfiles(profiles);
$('motionProfile').replaceChildren(...groupedProfiles.map(({ category, profiles: categoryProfiles }) => {
  const group = document.createElement('optgroup'); group.label = category;
  for (const profile of categoryProfiles) {
    const option = document.createElement('option'); option.value = profile.profileId;
    option.textContent = profile.shortTitle; group.append(option);
  }
  return group;
}));
let profileBrowser;
let presetId = model.profileId;
function loadProfile(profileId, announce = true) {
  if (!profiles[profileId]) return;
  presetId = profileId;
  applyModel(profiles[profileId], announce);
}
function applyModel(next, announce = true, preserveTime = false) {
  timeline.stop();
  model = next;
  timeline.end = model.end; timeline.time = preserveTime ? Math.min(timeline.time, model.end) : 0;
  for (const graph of graphs) { graph.model = model; graph.range = model.ranges[graph.order];
    graph.canvas.setAttribute('aria-label', `${model.title}: interactive ${['position','velocity','acceleration'][graph.order]}-time graph, 0 to ${model.end} seconds`);
  }
  if (model.profileId !== 'custom') $('motionProfile').value = model.profileId;
  $('profileDescription').textContent = model.description;
  $('profileFocus').textContent = `Focus: ${model.learningFocus}`;
  $('profileEquationText').textContent = model.equation;
  if (model.profileId !== 'custom') profileBrowser?.setSelected(model.profileId);
  $('timeScrubber').max = model.end;
  $('durationLabel').textContent = `${model.end} s`;
  $('roadMarks').innerHTML = model.roadTicks.map(n => `<span class="mark" data-position="${n}">${Number(n.toFixed(2))}</span>`).join('');
  if (isPosition) {
    for (const id of ['t1','t2']) $(id).max = model.end;
    $('t1').value = preserveTime ? numeric('t1', 0) : 0; $('t2').value = preserveTime ? numeric('t2', model.end) : Math.min(10, model.end);
    const corners = model.discontinuities[2];
    $('profileNote').textContent = corners.length
      ? model.discontinuities[1].length
        ? `Acceleration is undefined at ${corners.join(', ')} s. A velocity jump requires an idealised impulse; isolated corner values are not finite accelerations.`
        : `Acceleration is undefined at ${corners.join(', ')} s because the one-sided velocity slopes differ. Velocity remains continuous; there is no velocity jump.`
      : 'On this smooth motion, velocity is the derivative of position and acceleration is the derivative of velocity.';
  } else {
    $('areaStart').max = model.end; $('areaStart').value = preserveTime ? numeric('areaStart', 0) : 0;
    $('profileNote').textContent = model.zeroCrossings.length
      ? `Velocity crosses zero at ${model.zeroCrossings.join(', ')} s. Split the signed area there to calculate distance travelled.`
      : 'Position is the exact integral of this velocity graph. Signed area is displacement; absolute area is distance travelled.';
  }
  $('predictionAnswer').value = '';
  $('predictionPrompt').querySelector('p').textContent = `For “${model.title}”, predict the ${isPosition ? 'velocity graph from the position slope' : 'acceleration graph from the velocity slope'}. Where is it positive, zero or negative? Where is the derivative undefined?`;
  activities.setProfile(model);
  if (announce) $('profileAnnouncement').textContent = `${model.title} selected. Simulation reset to zero seconds. ${model.description}`;
  resize();
}
profileBrowser = createProfileBrowser({ root, profiles, prefix, selectProfile: profileId => loadProfile(profileId) });
$('motionProfile').addEventListener('change', event => loadProfile(event.target.value));
loadProfile(model.profileId, false);
builder = createBuilder({ root, graph: primary, family: model.id, pause: () => timeline.stop(), redraw: render,
  activate: (custom, preserveTime) => custom ? applyModel(custom, false, preserveTime) : loadProfile(presetId, false) });
return { pause, resize, onKeydown };
}
