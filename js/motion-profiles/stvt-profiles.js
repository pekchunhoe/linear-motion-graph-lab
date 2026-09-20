import { model as original } from '../st-vt/physics.js';
import { makeProfile } from './profile.js';

// c contains position coefficients in u = t − segment.start, ascending powers.
const definitions = [
  { profileId: 'original', title: 'Original five-stage journey', category: 'Multi-stage', previewLabel: 'Several stages and corners',
    description: 'Speed up, slow down, rest, then go back and forward.',
    learningFocus: 'Connect curved slopes, rest and idealised velocity jumps.',
    equation: 's = 2t² (0–5); 50+20u−2u², u=t−5 (5–10); 100 (10–15); 100−20u, u=t−15 (15–25); −100+20u, u=t−25 (25–30)',
    segments: original.segments, road: original.road, roadTicks: original.roadTicks },
  { profileId: 'uniform-forward', title: 'Uniform forward motion', category: 'Basic motion', previewLabel: 'Constant positive slope',
    description: 'Position rises steadily: constant positive velocity.', learningFocus: 'A constant positive slope means constant positive velocity.',
    equation: 's = 5 + 3t', segments: [{ start: 0, end: 10, c: [5, 3] }] },
  { profileId: 'stationary', title: 'Stationary object', category: 'Basic motion', previewLabel: 'Horizontal position line',
    description: 'Fixed position: zero velocity and distance travelled.', learningFocus: 'A horizontal position graph means rest, even away from the origin.',
    equation: 's = 12', segments: [{ start: 0, end: 8, c: [12] }] },
  { profileId: 'uniform-backward', title: 'Uniform backward motion', category: 'Basic motion', previewLabel: 'Constant negative slope',
    description: 'Position falls while distance travelled increases.', learningFocus: 'Negative slope means negative velocity, not decreasing distance.',
    equation: 's = 20 − 4t', segments: [{ start: 0, end: 10, c: [20, -4] }] },
  { profileId: 'speeding-up', title: 'Speeding up forward', category: 'Accelerated motion', previewLabel: 'Slope becomes steeper',
    description: 'A steeper rising slope means greater forward speed.', learningFocus: 'Increasing positive slope gives positive acceleration.',
    equation: 's = t²/2', segments: [{ start: 0, end: 10, c: [0, 0, 0.5] }] },
  { profileId: 'slowing-down', title: 'Slowing down forward', category: 'Accelerated motion', previewLabel: 'Slope becomes gentler',
    description: 'Position rises with an ever gentler positive slope.', learningFocus: 'Forward motion can slow down without reversing.',
    equation: 's = 10t − t²/2', segments: [{ start: 0, end: 8, c: [0, 10, -0.5] }] },
  { profileId: 'reverse', title: 'Forward → stop → reverse', category: 'Reversal', previewLabel: 'Peak: stop then reverse',
    description: 'Zero slope at the peak: stop, then reverse.', learningFocus: 'A smooth turning point is a momentary stop and reversal.',
    equation: 's = 8t − t²', segments: [{ start: 0, end: 8, c: [0, 8, -1] }] },
  { profileId: 'staged', title: 'Forward → rest → backward → rest', shortTitle: 'Forward, rest, backward, rest', category: 'Multi-stage', previewLabel: 'Straight stages and rest',
    description: 'Straight stages; velocity is undefined at corners.', learningFocus: 'Distinguish stationary intervals from undefined velocity at corners.',
    equation: 's = 4t (0–3); 12 (3–5); 12−3u, u=t−5 (5–9); 0 (9–12)',
    segments: [{ start: 0, end: 3, c: [0, 4] }, { start: 3, end: 5, c: [12] }, { start: 5, end: 9, c: [12, -3] }, { start: 9, end: 12, c: [0] }] },
  { profileId: 'smooth-journey', title: 'Smooth changing motion', category: 'Accelerated motion', previewLabel: 'Smoothly changing slope',
    description: 'A smooth curve speeds up, slows down, then turns back.', learningFocus: 'Velocity and acceleration can change continuously and cross zero at different times.',
    equation: 's = 3t² − t³/3', segments: [{ start: 0, end: 12, c: [0, 0, 3, -1 / 3] }] }
];
export const STVT_PROFILES = Object.fromEntries(definitions.map(d => [d.profileId, makeProfile(1, d)]));
