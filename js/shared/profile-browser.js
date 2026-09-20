import { segmentValue } from './physics-core.js';
import { colors } from './graph.js';

export const PROFILE_CATEGORY_ORDER = ['Basic motion', 'Accelerated motion', 'Reversal', 'Multi-stage'];

export function groupProfiles(profiles) {
  const seen = new Set();
  const groups = PROFILE_CATEGORY_ORDER.map(category => ({
    category,
    profiles: Object.values(profiles).filter(profile => profile.category === category)
  })).filter(group => group.profiles.length);
  for (const group of groups) for (const profile of group.profiles) {
    if (seen.has(profile.profileId)) throw new Error(`Duplicate profile in browser: ${profile.profileId}`);
    seen.add(profile.profileId);
  }
  if (seen.size !== Object.keys(profiles).length) throw new Error('Every profile needs a supported profile-browser category.');
  return groups;
}

// Lightweight schematic renderer. It samples the exact polynomial segments used
// by the main graph; there are no per-profile thumbnail paths or animations.
export function renderProfilePreview(canvas, profile) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const context = canvas.getContext('2d');
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  context.clearRect(0, 0, width, height);
  const order = profile.previewOrder ?? (profile.id === 1 ? 0 : 1);
  const [min, max] = profile.ranges[order];
  const left = 7, right = width - 7, top = 6, bottom = height - 7;
  const x = time => left + time / profile.end * (right - left);
  const y = value => bottom - (value - min) / (max - min) * (bottom - top);
  context.strokeStyle = '#9bafbd'; context.lineWidth = 1;
  context.beginPath(); context.moveTo(left, y(0)); context.lineTo(right, y(0)); context.stroke();
  context.beginPath(); context.moveTo(left, top); context.lineTo(left, bottom); context.stroke();
  context.strokeStyle = colors[order]; context.lineWidth = 2.25; context.lineJoin = 'round'; context.lineCap = 'round';
  for (const segment of profile.segments) {
    context.beginPath();
    for (let i = 0; i <= 28; i++) {
      const time = segment.start + (segment.end - segment.start) * i / 28;
      const value = segmentValue(segment, time, order);
      if (i === 0) context.moveTo(x(time), y(value)); else context.lineTo(x(time), y(value));
    }
    context.stroke();
  }
  return true;
}

export function createProfileBrowser({ root, profiles, prefix, selectProfile }) {
  const $ = name => root.querySelector(`#${prefix}${name}`);
  const panel = $('profileBrowser');
  const browseButton = $('browseProfiles');
  const groups = groupProfiles(profiles);
  const cards = new Map();
  const narrow = window.matchMedia('(max-width: 900px)');
  let open = false;

  for (const group of groups) {
    const section = document.createElement('section'); section.className = 'profile-category';
    const heading = document.createElement('h2'); heading.className = 'profile-category-title'; heading.textContent = group.category; section.append(heading);
    const list = document.createElement('div'); list.className = 'profile-card-grid';
    for (const profile of group.profiles) {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'profile-card'; card.dataset.profileId = profile.profileId;
      card.setAttribute('aria-label', `Select ${profile.title}: ${profile.previewLabel}`);
      card.setAttribute('aria-pressed', 'false');
      const preview = document.createElement('canvas'); preview.className = 'profile-preview'; preview.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span'); title.className = 'profile-card-title'; title.textContent = profile.shortTitle;
      const label = document.createElement('span'); label.className = 'profile-card-label'; label.textContent = profile.previewLabel;
      card.append(preview, title, label);
      card.addEventListener('click', () => {
        selectProfile(profile.profileId);
        if (narrow.matches) setOpen(false, true);
      });
      cards.set(profile.profileId, { card, preview, profile }); list.append(card);
    }
    section.append(list); panel.append(section);
  }

  function draw() {
    if (narrow.matches && !open) return;
    cards.forEach(({ preview, profile }) => renderProfilePreview(preview, profile));
  }
  function setOpen(next, restoreFocus = false) {
    open = next && narrow.matches;
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(narrow.matches && !open));
    browseButton.setAttribute('aria-expanded', String(open));
    if (open) draw();
    if (restoreFocus) browseButton.focus({ preventScroll: true });
  }
  function setSelected(profileId) {
    cards.forEach(({ card }, id) => {
      const selected = id === profileId;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-pressed', String(selected));
    });
  }
  function syncViewport() {
    if (!narrow.matches) {
      open = false; panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'false');
      browseButton.hidden = true; browseButton.setAttribute('aria-expanded', 'false'); draw();
    } else {
      browseButton.hidden = false; setOpen(false);
    }
  }
  browseButton.addEventListener('click', () => setOpen(!open));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
  });
  narrow.addEventListener('change', syncViewport);
  syncViewport();
  return { setSelected, resize: draw, groups };
}
