import { test, expect } from '@playwright/test';
import { model, stateAt } from '../js/st-vt/physics.js';
import AxeBuilder from '@axe-core/playwright';
const sizes=[[320,568],[360,640],[375,667],[390,844],[412,915],[430,932],[768,1024],[820,1180],[1024,768],[1180,820],[1280,720],[1366,768],[1440,900]];
const primary=model.id===1?'#sim1-positionCanvas':'#sim1-velocityCanvas';
const derived=model.id===1?'#sim1-velocityCanvas':'#sim1-accCanvas';
async function seek(page,t) {
  await page.locator('#sim1-timeScrubber').fill(String(t));
  await expect(page.locator('#sim1-live-t')).toHaveText(`${t.toFixed(2)} s`);
}
async function geometry(page) {
  return page.evaluate(()=>{
    const rect=selector=>{const r=document.getElementById('sim1').querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    return {overflow:document.documentElement.scrollWidth>innerWidth,car:rect('#sim1-carContainer'),road:rect('.road'),
      canvases:[...document.getElementById('sim1').querySelectorAll('canvas')].map(c=>({width:c.clientWidth,height:c.clientHeight,backing:c.width,dpr:devicePixelRatio,focus:c.tabIndex,label:c.getAttribute('aria-label')})),
      cards:[...document.getElementById('sim1').querySelectorAll('.dashboard>.card')].map(c=>c.getBoundingClientRect().y),
      badControls:[...document.getElementById('sim1').querySelectorAll('button,input,select,textarea')].filter(c=>c.getClientRects().length).filter(c=>{const r=c.getBoundingClientRect();return r.width<=0||r.right>innerWidth+1||r.left<0;}).map(c=>c.id)};
  });
}
test.beforeEach(async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page._errors=errors;
  await page.goto('/');
  await expect(page.locator('#sim1-live-position')).toHaveText('0.00 m');
});
test.afterEach(async({page})=>expect(page._errors).toEqual([]));
for(const [width,height] of sizes) {
  test(`layout ${width}×${height}: sharp graphs, car, controls, no overflow`,async({page},info)=>{
    await page.setViewportSize({width,height});
    await seek(page,model.id===1?20:11);
    await expect.poll(async()=>{const g=await geometry(page);return g.canvases.every(c=>Math.abs(c.backing-c.width*c.dpr)<3);}).toBe(true);
    const g=await geometry(page);
    expect(g.overflow).toBe(false);expect(g.badControls).toEqual([]);
    expect(g.car.x).toBeGreaterThanOrEqual(g.road.x);expect(g.car.right).toBeLessThanOrEqual(g.road.right);
    for(const canvas of g.canvases){expect(canvas.width).toBeGreaterThan(200);expect(canvas.height).toBeGreaterThanOrEqual(145);expect(canvas.focus).toBe(0);expect(canvas.label).toBeTruthy();}
    if(width<600) {
      const pair=await page.locator('#sim1 .graph-card').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
      expect(pair[1].top-pair[0].bottom).toBeGreaterThanOrEqual(4); expect(pair[1].top-pair[0].bottom).toBeLessThanOrEqual(10);
      const strip=await page.locator('#sim1 .motion-strip').boundingBox(); expect(strip.height).toBeLessThanOrEqual(90);
    }
    if(width>=1000)expect(Math.max(...g.cards)-Math.min(...g.cards)).toBeLessThan(2);
    await page.screenshot({path:info.outputPath(`sim${model.id}-${width}x${height}.png`),fullPage:true});
    // Open all learning panels too: narrow layouts must fit expanded controls.
    await page.locator('#sim1 details').evaluateAll(nodes=>nodes.forEach(n=>{n.open=true;}));
    const expanded=await geometry(page);expect(expanded.overflow).toBe(false);expect(expanded.badControls).toEqual([]);
  });
}
test('play stop resume reset rapid taps and end restart',async({page})=>{
  await page.locator('#sim1-playBtn').click();
  await expect.poll(async()=>Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeGreaterThan(0.1);
  await page.locator('#sim1-stopBtn').click();const stopped=await page.locator('#sim1-timeScrubber').inputValue();
  await page.waitForTimeout(180);expect(await page.locator('#sim1-timeScrubber').inputValue()).toBe(stopped);
  await page.locator('#sim1-playBtn').click();
  await expect.poll(async()=>Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeGreaterThan(Number(stopped));
  await page.locator('#sim1-playBtn').evaluate(button=>{for(let i=0;i<20;i++)button.click();});
  await page.locator('#sim1-stopBtn').click();await page.locator('#sim1-playBtn').click();await page.locator('#sim1-resetBtn').click();
  await expect(page.locator('#sim1-timeScrubber')).toHaveValue('0');await expect(page.locator('#sim1-playbackStatus')).toHaveText('Paused');
  await seek(page,model.end);await page.locator('#sim1-playBtn').click();
  await expect.poll(async()=>Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeLessThan(2);
  await page.locator('#sim1-stopBtn').click();
});
test('scrubber synchronizes exact values, corner treatment and car',async({page})=>{
  for(const t of [0,...model.segments.map(s=>s.end),model.id===1?7:9.6,model.id===1?20:11]) {
    await seek(page,t);const state=stateAt(model,t);
    for(const [key,unit] of [['position','m'],['distance','m'],['displacement','m'],['velocity','m s⁻¹'],['acceleration','m s⁻²']]) {
      const value=state[key];await expect(page.locator('#sim1-live-'+key)).toHaveText(value===null?'Undefined':`${Math.abs(value)<1e-8?'0.00':value.toFixed(2)} ${unit}`);
    }
    const mapped=await page.locator('#sim1-carContainer').evaluate(car=>({left:parseFloat(car.style.left),road:car.parentElement.clientWidth}));
    // CSS serializes positions to a limited decimal precision; allow 0.001 CSS px.
    expect(Math.abs(mapped.left-(26+(state.position-model.road[0])/(model.road[1]-model.road[0])*(mapped.road-52)))).toBeLessThan(0.001);
    if(state.velocity!==null&&state.velocity<0)await expect(page.locator('#sim1-carSVG')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)');
  }
  await seek(page,model.id===1?15:8);await expect(page.locator('#sim1-primaryReadout')).toContainText('undefined at corner');
});
test('keyboard and native input editing',async({page})=>{
  await page.locator(primary).focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#sim1-live-t')).toHaveText('0.10 s');
  await page.keyboard.press('Shift+ArrowRight');await expect(page.locator('#sim1-live-t')).toHaveText('1.10 s');
  await page.keyboard.press('ArrowLeft');await expect(page.locator('#sim1-live-t')).toHaveText('1.00 s');
  await page.keyboard.press('End');await expect(page.locator('#sim1-live-t')).toHaveText(`${model.end.toFixed(2)} s`);
  await page.keyboard.press('Home');await expect(page.locator('#sim1-live-t')).toHaveText('0.00 s');
  await page.keyboard.press('Space');await expect(page.locator('#sim1-playbackStatus')).toHaveText('Playing');
  await page.keyboard.press('Space');await expect(page.locator('#sim1-playbackStatus')).toHaveText('Paused');
  await page.keyboard.press('r');await expect(page.locator('#sim1-live-t')).toHaveText('0.00 s');
  await page.locator('#sim1-challenges summary').click();await page.locator('#sim1-challengeAnswer').fill('r');
  await page.locator('#sim1-challengeAnswer').press('ArrowRight');await expect(page.locator('#sim1-challengeAnswer')).toHaveValue('r');
});
test('mouse dragging either graph pauses playback',async({page})=>{
  for(const selector of [primary,derived]) {
    await page.locator('#sim1-playBtn').click();await page.locator(selector).scrollIntoViewIfNeeded();
    const r=await page.locator(selector).boundingBox();
    await page.mouse.move(r.x+50,r.y+100);await page.mouse.down();
    await page.mouse.move(r.x+r.width-22,r.y+100,{steps:8});await page.mouse.up();
    await expect(page.locator('#sim1-playbackStatus')).toHaveText('Paused');
    expect(Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeGreaterThan(model.end*0.9);
  }
});
test('touch drag, cancellation, secondary contacts and pen',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const cdp=await page.context().newCDPSession(page);
  for(const selector of [primary,derived]) {
    await page.locator(selector).scrollIntoViewIfNeeded();const r=await page.locator(selector).boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+65,y:r.y+80,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+r.width-35,y:r.y+80,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    expect(Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeGreaterThan(model.end*0.8);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+75,y:r.y+80,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  }
  await page.locator(primary).scrollIntoViewIfNeeded();const r=await page.locator(primary).boundingBox();
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x+100,y:r.y+80,button:'left',clickCount:1,pointerType:'pen'});
  const before=await page.locator('#sim1-timeScrubber').inputValue();
  await page.locator(primary).dispatchEvent('pointerdown',{pointerId:999,isPrimary:false,button:0,clientX:r.x+r.width-20,pointerType:'touch'});
  expect(await page.locator('#sim1-timeScrubber').inputValue()).toBe(before);
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+r.width-30,y:r.y+80,button:'left',buttons:1,pointerType:'pen'});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x+r.width-30,y:r.y+80,button:'left',clickCount:1,pointerType:'pen'});
  expect(Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeGreaterThan(model.end*0.8);
  await page.locator('#sim1-playBtn').click();await expect(page.locator('#sim1-playbackStatus')).toHaveText('Playing');
});
test('resize orientation and prediction preserve state',async({page})=>{
  await page.locator('#sim1-predictionActivity summary').click();
  await seek(page,7);await page.setViewportSize({width:390,height:844});
  await page.setViewportSize({width:1180,height:820});
  await expect(page.locator('#sim1-live-t')).toHaveText('7.00 s');
  await page.locator('#sim1-predictBtn').click();await expect(page.locator(derived)).toBeHidden();
  await expect(page.locator('#sim1-live-t')).toHaveText('7.00 s');
  await page.locator('#sim1-predictBtn').click();await expect(page.locator(derived)).toBeVisible();
  await expect(page.locator('#sim1-live-t')).toHaveText('7.00 s');
  await page.locator('#sim1-playBtn').click();await page.setViewportSize({width:820,height:1180});
  await expect(page.locator('#sim1-playbackStatus')).toHaveText('Playing');
  await expect.poll(async()=>Number(await page.locator('#sim1-timeScrubber').inputValue())).toBeGreaterThan(7);
  await page.locator('#sim1-stopBtn').click();
});
test('challenge feedback, hints, solutions and concepts',async({page})=>{
  await page.locator('#sim1-challenges summary').click();await page.locator('#sim1-solutionBtn').click();
  await expect(page.locator('#sim1-challengeFeedback')).toContainText('Try an answer');
  await page.locator('#sim1-challengeAnswer').fill(model.id===1?'positive':'negative');await page.locator('#sim1-checkAnswer').click();
  await expect(page.locator('#sim1-challengeFeedback')).toContainText('Correct');
  await page.locator('#sim1-hintBtn').click();await expect(page.locator('#sim1-challengeFeedback')).not.toBeEmpty();
  await page.locator('#sim1-solutionBtn').click();await expect(page.locator('#sim1-challengeFeedback')).toContainText('m s⁻¹');
  await page.locator('#sim1-challengeSelect').selectOption('1');await expect(page.locator('#sim1-challengeAnswer')).toHaveValue('');
  await page.locator('#sim1-concepts summary').click();await expect(page.locator('#sim1-conceptContent')).toBeVisible();
  await expect(page.locator('#sim1-conceptContent')).toContainText('Negative acceleration does not always mean slowing down');
});
test('simulation-specific learning tools',async({page},info)=>{
  if(model.id===1) {
    await page.locator('#sim1-averagePanel summary').click();await page.locator('#sim1-averageMode').check();
    await expect(page.locator('#sim1-averageResult')).toContainText('10.00 m s⁻¹');
    await page.locator('#sim1-t1').fill('10');await expect(page.locator('#sim1-averageResult')).toContainText('two different times');
    await page.locator('#sim1-t1').fill('0');
    await page.locator('#sim1-workedExample summary').click();
    for(const [i,answer] of ['12','15','1.2'].entries()) {
      await page.locator(`#sim1-exampleShow${i}`).click();await expect(page.locator(`#sim1-exampleFeedback${i}`)).toContainText('Attempt');
      await page.locator(`#sim1-example${i}`).fill(answer);await page.locator(`#sim1-exampleCheck${i}`).click();
      await expect(page.locator(`#sim1-exampleFeedback${i}`)).toContainText('Correct');
      await page.locator(`#sim1-exampleShow${i}`).click();await expect(page.locator(`#sim1-exampleFeedback${i}`)).not.toContainText('Attempt');
    }
  } else {
    await page.locator('#sim1-areaPanel summary').click();
    await seek(page,18);await expect(page.locator('#sim1-velocityAreaResult')).toContainText('262.00 m');
    await page.locator('#sim1-areaMode').selectOption('distance');await page.locator('#sim1-accelerationArea').check();
    await page.locator('#sim1-areaStart').fill('8');await seek(page,12);
    await expect(page.locator('#sim1-accelerationAreaResult')).toContainText('−50.00'.replace('−','-'));
    await page.locator('#sim1-areaStart').fill('15');await expect(page.locator('#sim1-velocityAreaResult')).toContainText('later than current time');
    await page.locator('#sim1-areaStart').fill('0');
    await page.locator('#sim1-abcde summary').click();
    for(const [i,d,s] of [[0,'positive','speeding up'],[1,'positive','slowing down'],[2,'negative','speeding up'],[3,'negative','slowing down']]) {
      await page.locator(`#sim1-abcDirection${i}`).selectOption(d);await page.locator(`#sim1-abcSpeed${i}`).selectOption('constant');
      await expect(page.locator(`#sim1-abcFeedback${i}`)).toContainText('Not yet');
      await page.locator(`#sim1-abcSpeed${i}`).selectOption(s);await expect(page.locator(`#sim1-abcFeedback${i}`)).toContainText('Correct');
    }
  }
  await page.screenshot({path:info.outputPath(`sim${model.id}-learning.png`),fullPage:true});
});
test('zoom access, reduced motion and car without interpolation',async({page})=>{
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toBe('width=device-width, initial-scale=1');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#sim1-carSVG')).toHaveCSS('transition-duration','0s');
  await expect(page.locator('#sim1-carContainer')).toHaveCSS('transition-duration','0s');
  await page.locator('#sim1-playBtn').click();await expect(page.locator('#sim1-playbackStatus')).toHaveText('Playing');
});
test('accessibility audit with every learning panel expanded',async({page})=>{
  await page.locator('#sim1 details').evaluateAll(nodes=>nodes.forEach(node=>{node.open=true;}));
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});
