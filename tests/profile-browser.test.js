import test from 'node:test';
import assert from 'node:assert/strict';
import { STVT_PROFILES } from '../js/motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../js/motion-profiles/vtat-profiles.js';
import { PROFILE_CATEGORY_ORDER, groupProfiles, renderProfilePreview } from '../js/shared/profile-browser.js';

for (const [name, profiles] of [['STVT', STVT_PROFILES], ['VTAT', VTAT_PROFILES]]) {
  test(`${name} browser groups every profile once in learning order`, () => {
    const groups = groupProfiles(profiles);
    assert.deepEqual(groups.map(group => group.category), PROFILE_CATEGORY_ORDER);
    const ids = groups.flatMap(group => group.profiles.map(profile => profile.profileId));
    assert.equal(ids.length, Object.keys(profiles).length);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(new Set(ids), new Set(Object.keys(profiles)));
    for (const profile of Object.values(profiles)) {
      assert.ok(profile.category?.trim());
      assert.ok(profile.previewLabel?.trim());
      assert.ok(profile.equation?.trim());
    }
  });
}

for (const profile of [...Object.values(STVT_PROFILES), ...Object.values(VTAT_PROFILES)]) {
  test(`preview ${profile.id}/${profile.profileId} samples the real primary model sharply`, () => {
    const calls = [];
    const context = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => {
      calls.push([key, ...args]);
      for (const argument of args) if (typeof argument === 'number') assert.ok(Number.isFinite(argument), `${key} received a non-finite coordinate`);
    }});
    const canvas = { width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => ({ width: 144, height: 48 }) };
    globalThis.window = { devicePixelRatio: 3 };
    assert.equal(renderProfilePreview(canvas, profile), true);
    assert.equal(canvas.width, 288); assert.equal(canvas.height, 96);
    assert.ok(calls.filter(([method]) => method === 'lineTo').length >= profile.segments.length * 28);
    assert.ok(calls.some(([method]) => method === 'stroke'));
  });
}
