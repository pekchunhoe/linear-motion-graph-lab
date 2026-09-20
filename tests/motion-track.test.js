import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackMapping, originSummary, originVisible, trackMarkerData } from '../js/shared/motion-track.js';

test('origin is available only when zero is inside the existing finite track range', () => {
  assert.equal(originVisible([-40, 60]), true);
  assert.equal(originVisible([0, 150]), true);
  assert.equal(originVisible([30, 80]), false);
  assert.equal(originVisible([-80, -30]), false);
  assert.equal(originVisible([0, 0]), false);
  assert.equal(originVisible([0, Infinity]), false);
});

test('car and origin use the same exact position-to-pixel mapping', () => {
  const track = createTrackMapping([-40, 60], 300, 40);
  assert.equal(track.originVisible, true);
  assert.equal(track.positionToPixel(0), 25 + 40 / 100 * 250);
  assert.equal(track.positionToPixel(0), track.positionToPixel(0));
  assert.equal(track.positionToPixel(-40), 25);
  assert.equal(track.positionToPixel(60), 275);
});

test('origin summaries distinguish visible track sides and an unavailable origin', () => {
  assert.match(originSummary(0, true), /car is at the origin/i);
  assert.match(originSummary(-8, true), /8.00 m to the left/i);
  assert.match(originSummary(12, true), /12.00 m to the right/i);
  assert.match(originSummary(12, false), /outside this visible track range/i);
});

test('marker data replaces a zero tick only when zero is truly on the displayed track', () => {
  assert.deepEqual(trackMarkerData([-40, 60], [-40, 0, 20, 60]), { visible: true, ordinaryTicks: [-40, 20, 60] });
  assert.deepEqual(trackMarkerData([30, 80], [30, 50, 80]), { visible: false, ordinaryTicks: [30, 50, 80] });
});
