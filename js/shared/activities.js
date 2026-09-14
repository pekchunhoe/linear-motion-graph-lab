import { example } from './physics-core.js';
export const challenges = {
  1: [
    ['At t = 3 s, is velocity positive, negative or zero?', 'positive', 'Look at the slope of the position graph.', 'v = 4t = 12 m s⁻¹, so velocity is positive.'],
    ['How long is the stationary interval, in seconds?', '5', 'Find the horizontal position segment.', 'The car rests from 10 to 15 s: 5 s.'],
    ['What is the highest speed in this motion, in m s⁻¹?', '20', 'Compare slope magnitudes, including negative slopes.', 'The largest |v| is 20 m s⁻¹. It occurs at 5 s and on the nonzero straight segments.'],
    ['At t = 20 s, what is the constant velocity in m s⁻¹?', '-20', 'Position falls by 200 m over 10 s.', 'v = (−100 − 100)/(25 − 15) = −20 m s⁻¹.'],
    ['At t = 7 s, is the car speeding up or slowing down?', 'slowing down', 'The position graph rises but becomes less steep.', 'v = 12 m s⁻¹ and a = −4 m s⁻². Opposite signs mean slowing down.'],
    ['What is total displacement from 0 to 30 s, in metres?', '0', 'Compare final and initial positions.', 's(30) − s(0) = 0 − 0 = 0 m.'],
    ['What is total distance travelled from 0 to 30 s, in metres?', '400', 'Add path lengths before and after reversals.', '100 m outward + 200 m backward + 100 m forward = 400 m.'],
    ['What is average velocity from 0 to 10 s, in m s⁻¹?', '10', 'Use the secant, not the tangent at 5 s.', '(100 − 0)/10 = 10 m s⁻¹; instantaneous v(5) is 20 m s⁻¹.']
  ],
  2: [
    ['At t = 10 s, is velocity positive, negative or zero?', 'negative', 'Locate the zero crossing at 9.6 s.', 'v = 20 − 12.5(10 − 8) = −5 m s⁻¹. Motion is in the negative direction.'],
    ['What is acceleration at t = 6 s, in m s⁻²?', '0', 'Look at the horizontal velocity segment.', 'Velocity is constant at 20 m s⁻¹, so a = 0 m s⁻².'],
    ['At t = 9 s, is the car speeding up or slowing down?', 'slowing down', 'Compare the signs of velocity and acceleration.', 'v = 7.5 m s⁻¹ and a = −12.5 m s⁻²: opposite signs, slowing down.'],
    ['At t = 11 s, is the car speeding up or slowing down?', 'speeding up', 'Negative velocity can increase in magnitude.', 'v = −17.5 m s⁻¹ and a = −12.5 m s⁻²: matching signs, speeding up.'],
    ['At t = 15 s, is the car speeding up or slowing down?', 'slowing down', 'Velocity is negative but the slope is positive.', 'v = −15 m s⁻¹ and a = +5 m s⁻²: opposite signs, slowing down.'],
    ['What displacement occurs from 4 to 8 s, in metres?', '80', 'Use the rectangle under the velocity graph.', 'Δs = 20 × 4 = 80 m.'],
    ['What is total distance travelled from 0 to 18 s, in metres?', '262', 'The maximum position is 136 m; the final position is 10 m.', 'Distance = 136 + (136 − 10) = 262 m. Net displacement is only 10 m.'],
    ['What change in velocity occurs from 8 to 12 s, in m s⁻¹?', '-50', 'Use the signed rectangle under acceleration.', 'Δv = (−12.5) × 4 = −50 m s⁻¹, changing v from +20 to −30 m s⁻¹.']
  ]
};
const normalize = text => text.trim().toLowerCase().replaceAll('−', '-').replace(/\s+/g, ' ');
export function correctAnswer(answer, expected) {
  if (!answer.trim()) return false;
  return Number.isFinite(Number(expected)) ? Number.isFinite(Number(normalize(answer))) && Math.abs(Number(normalize(answer)) - Number(expected)) < 0.02 : normalize(answer) === normalize(expected);
}
const concepts = [
  ['Kinematics', 'Describing motion using position, velocity and acceleration, without considering its causes.'],
  ['Distance', 'Total path length travelled. A scalar that is always non-negative; accumulated distance never decreases.'],
  ['Displacement', 'Final position minus initial position, Δs. A vector; the signed component in one dimension may be positive, negative or zero.'],
  ['Speed', 'Distance travelled per unit time; a non-negative scalar. Instantaneous speed = |v|.'],
  ['Velocity', 'Rate of change of displacement; its sign gives direction. SI unit: m s⁻¹.'],
  ['Average velocity', 'v_avg = Δs/Δt. On a position-time graph this is the secant slope.'],
  ['Instantaneous velocity', 'v = ds/dt, the tangent slope at a smooth point on the position-time graph.'],
  ['Uniform velocity', 'Constant velocity. Instantaneous and average velocity agree over every nonzero interval.'],
  ['Acceleration', 'Rate of change of velocity. SI unit: m s⁻². Negative acceleration does not always mean slowing down.'],
  ['Average acceleration', 'a_avg = Δv/Δt over a nonzero time interval.'],
  ['Instantaneous acceleration', 'a = dv/dt, the tangent slope of the velocity-time graph at a smooth point.'],
  ['Uniform acceleration', 'Constant acceleration; the velocity-time graph is a straight line.'],
  ['Signs and speed', 'v > 0, a > 0 or v < 0, a < 0: speeding up. v > 0, a < 0 or v < 0, a > 0: slowing down. At v = 0 inspect the neighbouring motion.'],
  ['Graph rules', 'Position-time gradient → velocity. Velocity-time gradient → acceleration; signed area → displacement. Acceleration-time signed area → change in velocity.'],
  ['Corners and units', 'At a sharp corner the derivative is undefined exactly at that instant. Position/displacement: m; time: s. A decreasing graph describes position, never accumulated distance.']
];
export function setupActivities(id, root, prefix) {
  const $ = name => root.querySelector('#' + prefix + name);
  const namespace = markup => markup.replace(/\b(id|for)="([^"]+)"/g, (_, attr, value) => `${attr}="${prefix}${value}"`);
  $('conceptContent').innerHTML = namespace(`<dl class="concept-list">${concepts.map(([term, text]) => `<dt>${term}</dt><dd>${text}</dd>`).join('')}</dl>`);
  const questions = challenges[id];
  $('challengeSelect').innerHTML = namespace(questions.map((q, i) => `<option value="${i}">Challenge ${i + 1} of ${questions.length}</option>`).join(''));
  let attempted = false;
  const current = () => questions[Number($('challengeSelect').value)];
  const showQuestion = () => { attempted = false; $('challengeQuestion').textContent = current()[0]; $('challengeAnswer').value = ''; $('challengeFeedback').textContent = ''; };
  $('challengeSelect').addEventListener('change', showQuestion);
  $('checkAnswer').addEventListener('click', () => {
    const answer = $('challengeAnswer').value;
    if (!answer.trim()) { $('challengeFeedback').textContent = 'Enter an answer first.'; return; }
    attempted = true;
    $('challengeFeedback').textContent = correctAnswer(answer, current()[1]) ? `Correct. ${current()[3]}` : 'Not yet. Try the hint, check the graph, then try again.';
  });
  $('hintBtn').addEventListener('click', () => { $('challengeFeedback').textContent = current()[2]; });
  $('solutionBtn').addEventListener('click', () => { $('challengeFeedback').textContent = attempted ? current()[3] : 'Try an answer and press Check answer before revealing the solution.'; });
  showQuestion();
  if (id === 1) setupExample($, namespace); else setupABCDE($, namespace);
}
function setupExample($, namespace) {
  const questions = [
    ['A. Average velocity from 0 to 10 s (m s⁻¹)', example.average(0,10), 's(0) = 0 m. s(10) = 2.4(100) − 0.12(1000) = 120 m. Δs/Δt = (120 − 0)/(10 − 0) = 12 m s⁻¹.'],
    ['B. Instantaneous velocity at 5 s (m s⁻¹)', example.velocity(5), 'Differentiate: v(t) = 4.8t − 0.36t². Substitute t = 5: v(5) = 24 − 9 = 15 m s⁻¹.'],
    ['C. Instantaneous acceleration at 5 s (m s⁻²)', example.acceleration(5), 'Differentiate twice: v(t) = 4.8t − 0.36t²; a(t) = 4.8 − 0.72t. Substitute t = 5: a(5) = 4.8 − 3.6 = 1.2 m s⁻².']
  ];
  $('exampleQuestions').innerHTML = namespace(questions.map(([question], i) => `<div class="question"><label for="example${i}">${question}</label><input id="example${i}" type="number" step="any"><div class="actions"><button id="exampleCheck${i}">Check answer</button><button id="exampleShow${i}">Show solution</button></div><p id="exampleFeedback${i}" role="status"></p></div>`).join(''));
  questions.forEach(([, expected, solution], i) => {
    let attempted = false;
    $(`exampleCheck${i}`).addEventListener('click', () => {
      const input = $(`example${i}`);
      if (!Number.isFinite(input.valueAsNumber)) { $(`exampleFeedback${i}`).textContent = 'Enter a numerical answer first.'; return; }
      attempted = true;
      $(`exampleFeedback${i}`).textContent = correctAnswer(input.value, String(expected)) ? 'Correct. Press Show solution to see the steps.' : 'Not yet. Check whether this needs a secant slope or a derivative.';
    });
    $(`exampleShow${i}`).addEventListener('click', () => { $(`exampleFeedback${i}`).textContent = attempted ? solution : 'Attempt this question and press Check answer first.'; });
  });
}
function setupABCDE($, namespace) {
  const segments = [
    ['A → B', 'positive', 'speeding up', 'v > 0 and a > 0. Motion is positive and speed increases.'],
    ['B → C', 'positive', 'slowing down', 'v > 0 and a < 0. Motion is positive but speed decreases toward zero.'],
    ['C → D', 'negative', 'speeding up', 'v < 0 and a < 0. Motion is negative and speed increases. Negative acceleration here does not mean slowing down.'],
    ['D → E', 'negative', 'slowing down', 'v < 0 and a > 0. Motion is negative but speed decreases toward zero.']
  ];
  $('abcdeQuestions').innerHTML = namespace(segments.map(([name], i) => `<div class="question"><p><strong>${name}</strong> (inside the segment)</p><div class="input-row"><label>Direction<select id="abcDirection${i}"><option value="">Choose…</option><option>positive</option><option>negative</option><option>stationary</option></select></label><label>Speed<select id="abcSpeed${i}"><option value="">Choose…</option><option>speeding up</option><option>slowing down</option><option>constant</option></select></label></div><p id="abcFeedback${i}" role="status"></p></div>`).join('') + '<p>At C, velocity is momentarily zero as the object changes direction; this is not an interval of rest. At B and D the slope changes abruptly, so acceleration is undefined exactly there.</p>');
  segments.forEach(([, direction, speed, solution], i) => {
    const check = () => {
      const d = $(`abcDirection${i}`).value, s = $(`abcSpeed${i}`).value;
      $(`abcFeedback${i}`).textContent = !d || !s ? 'Choose both direction and speed change.' : d === direction && s === speed ? `Correct. ${solution}` : `Not yet. ${d !== direction ? 'Use the sign of velocity for direction.' : 'Compare the signs of velocity and acceleration for speed change.'}`;
    };
    $(`abcDirection${i}`).addEventListener('change', check); $(`abcSpeed${i}`).addEventListener('change', check);
  });
}
