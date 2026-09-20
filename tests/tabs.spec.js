import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') page.errors.push(message.text()); });
  await page.goto('/');
});
test.afterEach(async ({page}) => expect(page.errors).toEqual([]));

test('tabs preserve all independent state without navigation or hidden animation', async ({page}) => {
  let navigations = 0;
  page.on('framenavigated', () => navigations++);
  await page.locator('#sim1-timeScrubber').fill('12.4');
  await page.locator('#sim1-averagePanel summary').click();
  await page.locator('#sim1-averageMode').check();
  await page.locator('#sim1-t1').fill('3');
  await page.locator('#sim1-t2').fill('20');
  await page.locator('#sim1-challenges summary').click();
  await page.locator('#sim1-challengeSelect').selectOption('4');
  await page.locator('#sim1-challengeAnswer').fill('slowing down');
  await page.locator('#sim1-checkAnswer').click();
  await page.locator('#sim1-predictionActivity summary').click();
  await page.locator('#sim1-predictBtn').click();
  await page.locator('#sim1-predictionAnswer').fill('Negative after 15 seconds');
  await page.locator('#tab2').click();
  await expect(page.locator('#sim1')).toBeHidden();
  await page.locator('#sim2-timeScrubber').fill('11');
  await page.locator('#sim2-areaPanel summary').click();
  await page.locator('#sim2-areaStart').fill('8');
  await page.locator('#sim2-areaMode').selectOption('distance');
  await page.locator('#sim2-accelerationArea').check();
  await page.locator('#sim2-averageAcceleration').check();
  await page.locator('#sim2-predictionActivity summary').click();
  await page.locator('#sim2-predictBtn').click();
  await page.locator('#sim2-predictionAnswer').fill('Constant on each straight segment');
  await page.locator('#sim2-playBtn').click();
  await expect.poll(async () => Number(await page.locator('#sim2-timeScrubber').inputValue())).toBeGreaterThan(11.1);
  await page.locator('#tab1').click();
  const paused = await page.locator('#sim2-timeScrubber').inputValue();
  await expect(page.locator('#sim2-playbackStatus')).toHaveText('Paused');
  await expect(page.locator('#sim1-timeScrubber')).toHaveValue('12.4');
  await expect(page.locator('#sim1-t1')).toHaveValue('3');
  await expect(page.locator('#sim1-t2')).toHaveValue('20');
  await expect(page.locator('#sim1-averageMode')).toBeChecked();
  await expect(page.locator('#sim1-challengeSelect')).toHaveValue('4');
  await expect(page.locator('#sim1-challengeFeedback')).toContainText('Correct');
  await expect(page.locator('#sim1-predictionAnswer')).toHaveValue('Negative after 15 seconds');
  await expect(page.locator('#sim1-velocityCanvas')).toBeHidden();
  await page.locator('#sim1-predictBtn').click();
  await page.locator('#sim1-positionCanvas').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sim1-timeScrubber')).toHaveValue('12.5');
  await expect(page.locator('#sim2-timeScrubber')).toHaveValue(paused);
  for (let i = 0; i < 10; i++) {
    await page.locator('#tab2').click();
    await page.locator('#tab1').click();
  }
  await page.locator('#sim1-positionCanvas').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sim1-timeScrubber')).toHaveValue('12.6');
  await page.locator('#tab2').click();
  await expect(page.locator('#sim2-timeScrubber')).toHaveValue(paused);
  await expect(page.locator('#sim2-areaStart')).toHaveValue('8');
  await expect(page.locator('#sim2-areaMode')).toHaveValue('distance');
  await expect(page.locator('#sim2-accelerationArea')).toBeChecked();
  await expect(page.locator('#sim2-averageAcceleration')).toBeChecked();
  await expect(page.locator('#sim2-predictionAnswer')).toHaveValue('Constant on each straight segment');
  await expect(page.locator('#sim2-accCanvas')).toBeHidden();
  expect(navigations).toBe(0);
});

test('tab keyboard semantics, unique IDs and accessible references', async ({page}) => {
  await page.locator('#tab1').focus();
  for (const [key, active] of [['ArrowRight',2],['ArrowRight',1],['End',2],['Home',1],['ArrowLeft',2]]) {
    await page.keyboard.press(key);
    await expect(page.locator('#tab'+active)).toBeFocused();
    await expect(page.locator('#tab'+active)).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#sim'+active)).toBeVisible();
    await expect(page.locator('#sim'+active+'-timeScrubber')).toHaveValue('0');
  }
  const invalid = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(n=>n.id);
    const problems = ids.filter((id,i)=>ids.indexOf(id)!==i);
    for (const node of document.querySelectorAll('[for],[aria-controls],[aria-labelledby],[aria-describedby]')) {
      for (const attr of ['for','aria-controls','aria-labelledby','aria-describedby']) {
        for (const id of (node.getAttribute(attr)||'').split(' ').filter(Boolean)) {
          if (!document.getElementById(id)) problems.push(attr+':'+id);
        }
      }
    }
    return problems;
  });
  expect(invalid).toEqual([]);
});

test('average acceleration and signed/absolute intervals remain distinct', async ({page}) => {
  await page.locator('#tab2').click();
  await page.locator('#sim2-areaPanel summary').click();
  await page.locator('#sim2-areaStart').fill('8');
  await page.locator('#sim2-timeScrubber').fill('12');
  await page.locator('#sim2-averageAcceleration').check();
  await expect(page.locator('#sim2-averageAccelerationResult')).toContainText('-12.50 m s⁻²');
  await expect(page.locator('#sim2-accelerationAreaResult')).toContainText('-50.00 m s⁻¹');
  await expect(page.locator('#sim2-primaryReadout')).toContainText('undefined at corner');
  await page.locator('#sim2-areaStart').fill('12');
  await expect(page.locator('#sim2-averageAccelerationResult')).toContainText('Choose an earlier start');
  await page.locator('#sim2-areaStart').fill('0');
  await page.locator('#sim2-timeScrubber').fill('18');
  await expect(page.locator('#sim2-velocityAreaResult')).toContainText('Net Δs = 10.00 m; distance = 262.00 m');
  await page.locator('#sim2-areaMode').selectOption('distance');
  await expect(page.locator('#sim2-velocityAreaResult')).toContainText('distance = ∫|v| dt = 262.00 m');
});

test('DPR is capped, aligned plots survive rotation, captured pointer is released on tab switch', async ({page}) => {
  await page.setViewportSize({width:320,height:568});
  const canvas = page.locator('#sim1-positionCanvas');
  await canvas.scrollIntoViewIfNeeded();
  const r = await canvas.boundingBox();
  const pointers = [];
  await page.exposeFunction('recordCapture', type => pointers.push(type));
  await canvas.evaluate(c => {
    c.addEventListener('gotpointercapture',()=>window.recordCapture('got'));
    c.addEventListener('lostpointercapture',()=>window.recordCapture('lost'));
  });
  await page.mouse.move(r.x+70,r.y+65);
  await page.mouse.down();
  await page.mouse.move(r.x+120,r.y+65);
  await page.locator('#tab2').evaluate(button=>button.click());
  await page.mouse.up();
  await expect.poll(()=>pointers).toEqual(['got','lost']);
  for (const [width,height] of [[568,320],[320,568],[1024,768],[375,667]]) {
    await page.setViewportSize({width,height});
    for (const n of [1,2]) {
      await page.locator('#tab'+n).click();
      const geometry = await page.locator('#sim'+n+' canvas:not(.profile-preview)').evaluateAll(nodes=>nodes.map(c=>({x:c.getBoundingClientRect().x,w:c.getBoundingClientRect().width,backing:c.width})));
      expect(Math.abs(geometry[0].w-geometry[1].w)).toBeLessThan(1);
      if (width<1000) expect(geometry[0].x).toBe(geometry[1].x);
      expect(geometry.every(g=>g.backing<=Math.ceil(g.w*2))).toBe(true);
    }
  }
});
