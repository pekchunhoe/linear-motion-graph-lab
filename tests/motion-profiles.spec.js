import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STVT_PROFILES } from '../js/motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../js/motion-profiles/vtat-profiles.js';
import { profileChallenges } from '../js/shared/activities.js';
import { facingAt } from '../js/shared/physics-core.js';

const families = [Object.values(STVT_PROFILES), Object.values(VTAT_PROFILES)];
const sizes = [[320,568],[360,640],[375,667],[390,844],[412,915],[768,1024],[820,1180],[1024,768],[1180,820],[1366,768],[1440,900]];
const fmt = (n, unit = '') => n === null ? 'Undefined' : `${Math.abs(n) < 1e-8 ? '0.00' : n.toFixed(2)}${unit ? ' ' + unit : ''}`;
test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
    const pending = new Set();
    window.frameCount = () => pending.size;
    window.requestAnimationFrame = callback => {
      const id = request.call(window, timestamp => { pending.delete(id); callback(timestamp); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = id => { pending.delete(id); cancel.call(window, id); };
  });
  await page.goto('/');
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

for (const profiles of families) for (const p of profiles) {
  test(`selector ${p.id}/${p.profileId}: synchronized state, tools, prediction and challenge`, async ({ page }) => {
    const pre = `#sim${p.id}-`;
    await page.locator(`#tab${p.id}`).click();
    await page.locator(pre + 'motionProfile').selectOption(p.profileId);
    await expect(page.locator(pre + 'timeScrubber')).toHaveAttribute('max', String(p.end));
    await expect(page.locator(pre + 'timeScrubber')).toHaveValue('0');
    await expect(page.locator(pre + 'profileDescription')).toHaveText(p.description);
    const primary = page.locator(pre + (p.id === 1 ? 'positionCanvas' : 'velocityCanvas'));
    const derived = page.locator(pre + (p.id === 1 ? 'velocityCanvas' : 'accCanvas'));
    await expect(primary).toHaveAttribute('aria-label', new RegExp(p.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(primary).toBeVisible(); await expect(derived).toBeVisible();
    for (const t of [...p.importantTimes, ...p.zeroCrossings.flatMap(t=>[Number((t-0.01).toFixed(2)), Number((t+0.01).toFixed(2))]), Number((p.end * 0.37).toFixed(2))]) {
      await page.locator(pre + 'timeScrubber').fill(String(t));
      const s = p.stateAt(t);
      for (const [key, unit] of [['position','m'],['velocity','m s⁻¹'],['acceleration','m s⁻²'],['distance','m'],['displacement','m'],['speed','m s⁻¹']]) {
        await expect(page.locator(pre + 'live-' + key)).toHaveText(fmt(s[key], unit));
      }
      await expect(page.locator(pre + 'live-direction')).toHaveText(s.direction);
      await expect(page.locator(pre + 'live-motionState')).toHaveText(s.motionState);
      const car = await page.locator(pre + 'carContainer').evaluate(n => ({ left: parseFloat(n.style.left), width: n.parentElement.clientWidth, carWidth: n.querySelector('svg').getBoundingClientRect().width }));
      const pad = car.carWidth / 2 + 5;
      expect(car.left).toBeCloseTo(pad + (s.position - p.road[0]) / (p.road[1] - p.road[0]) * (car.width - 2 * pad), 2);
      await expect(page.locator(pre + 'carSVG')).toHaveCSS('transform', facingAt(p,t) < 0 ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'matrix(1, 0, 0, 1, 0, 0)');
      if (s.velocity !== null && s.acceleration !== null) await expect(page.locator(pre + 'segmentExplanation')).toContainText(`At t = ${fmt(t,'s')}`);
      await expect(page.locator(pre + 'primaryReadout')).toContainText(p.id === 1 && s.velocity === null || p.id === 2 && s.acceleration === null ? 'undefined at corner' : fmt(p.id === 1 ? s.velocity : s.acceleration));
    }
    if (p.id === 1) {
      await page.locator(pre + 'averagePanel summary').click();
      await page.locator(pre + 't1').fill('0'); await page.locator(pre + 't2').fill(String(p.end));
      await page.locator(pre + 'averageMode').check();
      await expect(page.locator(pre + 'averageResult')).toContainText(fmt(p.interval(0,p.end).averageVelocity,'m s⁻¹'));
    } else {
      await page.locator(pre + 'areaPanel summary').click();
      await page.locator(pre + 'timeScrubber').fill(String(p.end));
      await page.locator(pre + 'areaMode').selectOption('distance');
      await page.locator(pre + 'accelerationArea').check();
      await expect(page.locator(pre + 'velocityAreaResult')).toContainText(`distance = ∫|v| dt = ${fmt(p.interval(0,p.end).distance,'m')}`);
      await expect(page.locator(pre + 'accelerationAreaResult')).toContainText(`Δv = ∫a dt = ${fmt(p.interval(0,p.end).deltaVelocity,'m s⁻¹')}`);
    }
    await page.locator(pre + 'predictionActivity summary').click();
    await page.locator(pre + 'predictBtn').click(); await expect(derived).toBeHidden();
    await expect(page.locator(pre + 'predictionPrompt')).toContainText(p.title);
    await page.locator(pre + 'predictBtn').click(); await expect(derived).toBeVisible();
    await page.locator(pre + 'challenges summary').click();
    const question = profileChallenges(p)[6];
    await page.locator(pre + 'challengeSelect').selectOption('6');
    await expect(page.locator(pre + 'challengeQuestion')).toHaveText(question[0]);
    await page.locator(pre + 'challengeAnswer').fill(question[1]);
    await page.locator(pre + 'checkAnswer').click();
    await expect(page.locator(pre + 'challengeFeedback')).toContainText('Correct');
    expect(await page.locator(`#sim${p.id}`).textContent()).not.toMatch(/NaN|Infinity/);
  });
}

test('switching: pause, reset, rapid selection, independent tabs, hidden prediction and one RAF', async ({ page }) => {
  for (const n of [1,2]) {
    const pre = `#sim${n}-`;
    await page.locator(`#tab${n}`).click();
    await page.locator(pre + 'timeScrubber').fill(n === 1 ? '29' : '17');
    if (n === 1) {
      await page.locator(pre + 'averagePanel summary').click();
      await page.locator(pre + 't1').fill('24'); await page.locator(pre + 't2').fill('29');
    } else {
      await page.locator(pre + 'areaPanel summary').click();
      await page.locator(pre + 'areaStart').fill('16');
    }
    await page.locator(pre + 'playBtn').click();
    await expect.poll(() => page.evaluate(() => window.frameCount())).toBe(1);
    await page.locator(pre + 'motionProfile').selectOption(n === 1 ? 'stationary' : 'slowing-forward');
    await expect(page.locator(pre + 'playbackStatus')).toHaveText('Paused');
    await expect(page.locator(pre + 'timeScrubber')).toHaveValue('0');
    if (n === 1) {
      await expect(page.locator(pre + 't1')).toHaveValue('0'); await expect(page.locator(pre + 't2')).toHaveValue('8');
      await expect(page.locator(pre + 't2')).toHaveAttribute('max','8');
    } else {
      await expect(page.locator(pre + 'areaStart')).toHaveValue('0');
      await expect(page.locator(pre + 'areaStart')).toHaveAttribute('max','6');
    }
    await expect.poll(() => page.evaluate(() => window.frameCount())).toBe(0);
    await page.locator(pre + 'predictionActivity summary').click();
    await page.locator(pre + 'predictBtn').click();
    await page.locator(pre + 'predictionAnswer').fill('old prediction');
    await page.locator(pre + 'motionProfile').evaluate((select, ids) => {
      for (const id of [...ids, ...ids, 'reverse']) { select.value = id; select.dispatchEvent(new Event('change', { bubbles:true })); }
    }, families[n-1].map(p=>p.profileId));
    await expect(page.locator(pre + 'timeScrubber')).toHaveValue('0');
    await expect(page.locator(pre + 'predictionAnswer')).toHaveValue('');
    await expect(page.locator(pre + 'derivedGraph')).toBeHidden();
    await page.locator(pre + 'predictBtn').click();
    await expect(page.locator(pre + 'derivedGraph')).toBeVisible();
    await expect(page.locator(pre + 'profileAnnouncement')).toContainText('Simulation reset to zero');
  }
  await page.locator('#sim2-motionProfile').selectOption('cruise');
  await page.locator('#tab1').click(); await expect(page.locator('#sim1-motionProfile')).toHaveValue('reverse');
  await page.locator('#tab2').click(); await expect(page.locator('#sim2-motionProfile')).toHaveValue('cruise');
  await expect.poll(() => page.evaluate(() => window.frameCount())).toBe(0);
});

test('selected profiles retain physical state through orientation and resize', async ({ page }) => {
  for (const n of [1,2]) {
    const pre = `#sim${n}-`;
    await page.locator(`#tab${n}`).click();
    await page.locator(pre + 'motionProfile').selectOption('reverse');
    await page.locator(pre + 'timeScrubber').fill('5');
    const state = await page.locator(pre + 'liveState').textContent();
    for (const [width,height] of [[320,568],[568,320],[1024,768],[390,844]]) {
      await page.setViewportSize({width,height});
      await expect(page.locator(pre + 'motionProfile')).toHaveValue('reverse');
      await expect(page.locator(pre + 'timeScrubber')).toHaveValue('5');
      await expect(page.locator(pre + 'liveState')).toHaveText(state);
    }
  }
});

for (const [width,height] of sizes) test(`profiles responsive ${width}×${height}: all menus, graphs, car and controls fit`, async ({ page }, info) => {
  test.setTimeout(60000);
  await page.setViewportSize({width,height});
  for (const profiles of families) {
    await page.locator(`#tab${profiles[0].id}`).click();
    for (const p of profiles) {
      await page.locator(`#sim${p.id}-motionProfile`).selectOption(p.profileId);
      await page.locator(`#sim${p.id}-timeScrubber`).fill(String(p.end));
      const geometry = await page.locator(`#sim${p.id}`).evaluate(root => {
        const rect = s => root.querySelector(s).getBoundingClientRect();
        const road = rect('.road'), car = rect('[id$="-carContainer"]'), picker = rect('.profile-picker');
        return { overflow: document.documentElement.scrollWidth > innerWidth, carFits: car.left >= road.left && car.right <= road.right,
          pickerHeight: picker.height,
          badControls: [...root.querySelectorAll('select,input,button')].filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect(); return r.left<0||r.right>innerWidth||r.width<=0;}).map(n=>n.id),
          graphs: [...root.querySelectorAll('canvas')].map(n=>({width:n.clientWidth,height:n.clientHeight})),
          marks: [...root.querySelectorAll('.mark')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};}) };
      });
      expect(geometry.overflow).toBe(false); expect(geometry.carFits).toBe(true); expect(geometry.badControls).toEqual([]);
      expect(geometry.pickerHeight).toBeLessThan(85);
      expect(geometry.graphs.every(r=>r.width>200&&r.height>=145)).toBe(true);
      for (let i=1;i<geometry.marks.length;i++) expect(geometry.marks[i].left).toBeGreaterThan(geometry.marks[i-1].right);
    }
    await page.screenshot({path:info.outputPath(`profiles-${profiles[0].id}-${width}.png`),fullPage:true});
  }
});

test('profile accessibility: keyboard select, labels, announcements and expanded panels', async ({ page }) => {
  for (const n of [1,2]) {
    await page.locator(`#tab${n}`).click();
    const select = page.getByLabel('Motion graph', {exact:true}).filter({visible:true});
    await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(select).not.toHaveValue('original');
    await page.locator(`#sim${n} details`).evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
    const audit = await new AxeBuilder({page}).include(`#sim${n}`).analyze();
    expect(audit.violations).toEqual([]);
  }
});
