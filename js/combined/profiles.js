import { STVT_PROFILES } from '../motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../motion-profiles/vtat-profiles.js';

// Metadata adapters only; all coefficients and analytic methods retain their
// validated source profile. IDs in this curated selection are unique.
const sources = [
  STVT_PROFILES['uniform-forward'], STVT_PROFILES['uniform-backward'], STVT_PROFILES.stationary,
  VTAT_PROFILES['from-rest'], VTAT_PROFILES['slowing-forward'], STVT_PROFILES.reverse,
  VTAT_PROFILES['negative-to-forward'], VTAT_PROFILES.cruise, STVT_PROFILES.original,
  STVT_PROFILES['smooth-journey']
];
export const COMBINED_PROFILES = Object.fromEntries(sources.map(profile => [profile.profileId, {
  ...profile, previewOrder: 0, previewLabel: `${profile.previewLabel} · s → v → a`
}]));
