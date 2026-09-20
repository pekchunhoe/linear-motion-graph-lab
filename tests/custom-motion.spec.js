import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const sizes = [[320,568],[360,640],[375,667],[390,844],[412,915],[768,1024],[820,1180],[1024,768],[1180,820],[1366,768],[1440,900]];
const rootFor = (page,n) => page.locator(`#sim${n}`);
async function custom(page,n) {
  await page.locator(`#tab${n}`).click();
  const root = rootFor(page,n); await root.getByRole('button',{name:'Custom graph',exact:true}).click(); return root;
}
async function numeric(root,point,field,value) {
  const details = root.locator('.custom-builder details').first();
  if (!(await details.getAttribute('open') !== null)) await details.locator('summary').click();
  const input=root.locator(`.point-table [data-index="${point}"][data-field="${field}"]`);
  await input.fill(String(value));await input.press('Tab');
}
test.beforeEach(async ({page}) => {
  page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')page.errors.push(m.text());});
  await page.addInitScript(()=>{
    const request=window.requestAnimationFrame,cancel=window.cancelAnimationFrame,pending=new Set();
    window.pendingFrames=()=>pending.size;
    window.requestAnimationFrame=callback=>{const id=request.call(window,t=>{pending.delete(id);callback(t);});pending.add(id);return id;};
    window.cancelAnimationFrame=id=>{pending.delete(id);cancel.call(window,id);};
  });
  await page.goto('/');
});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));

for (const n of [1,2]) test(`custom ${n}: numeric editing synchronizes model, car, tools, corners, prediction and challenges`,async({page})=>{
  const root=await custom(page,n), prefix=`#sim${n}-`;
  await numeric(root,1,'y',n===1?40:20);
  await page.locator(prefix+'timeScrubber').fill('2');
  await expect(page.locator(prefix+'live-position')).toHaveText(n===1?'20.00 m':'10.00 m');
  await expect(page.locator(prefix+'live-velocity')).toHaveText('10.00 m s⁻¹');
  await expect(page.locator(prefix+'live-acceleration')).toHaveText(n===1?'0.00 m s⁻²':'5.00 m s⁻²');
  const car=await page.locator(prefix+'carContainer').evaluate(el=>el.style.left);
  await page.locator(prefix+'timeScrubber').fill('4');
  await expect(page.locator(prefix+'primaryReadout')).toContainText('undefined at corner');
  expect(await page.locator(prefix+'carContainer').evaluate(el=>el.style.left)).not.toBe(car);
  if(n===1){
    await page.locator(prefix+'averagePanel summary').click();await page.locator(prefix+'t1').fill('0');await page.locator(prefix+'t2').fill('12');
    await expect(page.locator(prefix+'averageResult')).toContainText('v_avg = Δs/Δt = 0.00');
    await page.locator(prefix+'timeScrubber').fill('12');await expect(page.locator(prefix+'live-distance')).toHaveText('80.00 m');
  }else{
    await page.locator(prefix+'areaPanel summary').click();await page.locator(prefix+'timeScrubber').fill('12');
    await expect(page.locator(prefix+'velocityAreaResult')).toContainText('distance = 128.00 m');
    await expect(page.locator(prefix+'accelerationAreaResult')).toContainText('Δv = ∫a dt = 0.00');
  }
  await page.locator(prefix+'predictionActivity summary').click();await page.locator(prefix+'predictBtn').click();
  await expect(page.locator(prefix+'derivedGraph')).toBeHidden();await page.locator(prefix+'predictBtn').click();await expect(page.locator(prefix+'derivedGraph')).toBeVisible();
  await page.locator(prefix+'challenges summary').click();await page.locator(prefix+'challengeSelect').selectOption('6');
  await page.locator(prefix+'challengeAnswer').fill(n===1?'80':'128');await page.locator(prefix+'checkAnswer').click();await expect(page.locator(prefix+'challengeFeedback')).toContainText('Correct');
});
for(const n of [1,2])test(`custom ${n}: mouse drag, keyboard, undo/redo and edit while playing`,async({page})=>{
  const root=await custom(page,n),prefix=`#sim${n}-`,node=root.locator('.graph-node').nth(1);
  await root.locator('[data-control="snap"]').uncheck();
  const before=await root.locator('[data-output="summary"]').textContent();
  const primary=page.locator(prefix+(n===1?'positionCanvas':'velocityCanvas')),derived=page.locator(prefix+(n===1?'velocityCanvas':'accCanvas'));
  const primaryBefore=await primary.evaluate(c=>c.toDataURL()),derivedBefore=await derived.evaluate(c=>c.toDataURL());
  await page.locator(prefix+'timeScrubber').fill('2');await page.locator(prefix+'playBtn').click();
  await node.scrollIntoViewIfNeeded();const box=await node.boundingBox();await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();
  await page.mouse.move(box.x+22,box.y+7,{steps:8});await page.mouse.up();
  await expect(page.locator(prefix+'playbackStatus')).toHaveText('Paused');
  await expect.poll(()=>page.evaluate(()=>window.pendingFrames())).toBe(0);
  expect(await primary.evaluate(c=>c.toDataURL())).not.toBe(primaryBefore);expect(await derived.evaluate(c=>c.toDataURL())).not.toBe(derivedBefore);
  expect(await root.locator('[data-output="summary"]').textContent()).not.toBe(before);
  const after=await root.locator('[data-output="summary"]').textContent();
  await root.getByRole('button',{name:'Undo',exact:true}).click();await expect(root.locator('[data-output="summary"]')).toHaveText(before);
  await root.getByRole('button',{name:'Redo',exact:true}).click();await expect(root.locator('[data-output="summary"]')).toHaveText(after);
  const time=await page.locator(prefix+'timeScrubber').inputValue();await node.focus();await page.keyboard.press('ArrowUp');await expect(page.locator(prefix+'timeScrubber')).toHaveValue(time);
  await expect(node).toHaveAttribute('aria-pressed','true');await expect(root.locator('.point-table tr.selected button')).toHaveText('B');
  await root.locator('.custom-builder details').first().locator('summary').click();
  await page.locator(prefix+'playBtn').click();await root.locator('.point-table [data-index="1"][data-field="y"]').focus();
  await expect(page.locator(prefix+'playbackStatus')).toHaveText('Paused');
});
for(const n of [1,2])test(`custom ${n}: structural history, duration clamp, smooth, validation, tab and source state`,async({page})=>{
  const prefix=`#sim${n}-`;await page.locator(`#tab${n}`).click();await page.locator(prefix+'motionProfile').selectOption('reverse');
  const root=await custom(page,n);await numeric(root,1,'y',25);const before=await root.locator('[data-output="summary"]').textContent();
  await root.getByRole('button',{name:'+ Add point',exact:true}).click();await expect(root.locator('.graph-node')).toHaveCount(5);
  await root.getByRole('button',{name:'Undo',exact:true}).click();await expect(root.locator('.graph-node')).toHaveCount(4);
  await root.getByRole('button',{name:'Delete point',exact:true}).click();await expect(root.locator('.graph-node')).toHaveCount(3);
  await root.getByRole('button',{name:'Undo',exact:true}).click();await expect(root.locator('[data-output="summary"]')).toHaveText(before);
  await root.locator('[data-control="style"]').selectOption('smooth');await page.locator(prefix+'timeScrubber').fill('4');await expect(page.locator(prefix+'primaryReadout')).not.toContainText('undefined');
  if(n===1)await expect(page.locator(prefix+'profileNote')).toContainText('Velocity remains continuous');
  await numeric(root,1,'t',0);await expect(root.locator('[role="alert"]')).toContainText('0.25');await expect(page.locator(prefix+'timeScrubber')).toHaveValue('4');
  await numeric(root,1,'t',4);await expect(root.locator('[role="alert"]')).toBeEmpty();
  await page.locator(prefix+'timeScrubber').fill('12');await numeric(root,3,'t',10);await expect(page.locator(prefix+'timeScrubber')).toHaveValue('10');await expect(page.locator(prefix+'timeScrubber')).toHaveAttribute('max','10');
  const draft=await root.locator('[data-output="summary"]').textContent();
  await root.getByRole('button',{name:'Preset graphs',exact:true}).click();await expect(page.locator(prefix+'motionProfile')).toHaveValue('reverse');
  await root.getByRole('button',{name:'Custom graph',exact:true}).click();await expect(root.locator('[data-output="summary"]')).toHaveText(draft);
  const other=await custom(page,n===1?2:1);await numeric(other,1,'y',7);await page.locator(`#tab${n}`).click();await expect(root.locator('[data-output="summary"]')).toHaveText(draft);
  await root.getByRole('button',{name:'Reset graph',exact:true}).click();await expect(root.locator('[data-control="style"]')).toHaveValue('straight');await expect(page.locator(prefix+'timeScrubber')).toHaveAttribute('max','12');
});
for(const n of [1,2])test(`custom ${n}: touch/pen pointer cancellation, release outside and consecutive edits`,async({page})=>{
  const root=await custom(page,n);await root.locator('[data-control="snap"]').uncheck();
  const node=root.locator('.graph-node').nth(1);await node.scrollIntoViewIfNeeded();
  for(const [pointerId,pointerType,ending] of [[31,'touch','pointercancel'],[32,'pen','pointerup'],[33,'touch','pointerup']]){
    const box=await node.boundingBox(),base={pointerId,pointerType,isPrimary:true,button:0,bubbles:true};
    // Synthetic events exercise cancellation and model updates; native touch below
    // additionally verifies real pointer capture via Chromium's touch input.
    await node.evaluate((el,{base,x,y,ending})=>{
      const capture=el.setPointerCapture;el.setPointerCapture=()=>{};
      el.dispatchEvent(new PointerEvent('pointerdown',{...base,clientX:x,clientY:y}));
      el.dispatchEvent(new PointerEvent('pointermove',{...base,clientX:x,clientY:y-12}));
      el.dispatchEvent(new PointerEvent(ending,base));el.setPointerCapture=capture;
    },{base,x:box.x+22,y:box.y+22,ending});
    await expect(root.locator('[data-action="undo"]')).toBeEnabled();
  }
  const session=await page.context().newCDPSession(page),box=await node.boundingBox();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+22,y:box.y+22}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+22,y:box.y+4}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await session.detach();await node.focus();await page.keyboard.press('ArrowDown');
  await expect.poll(()=>page.evaluate(()=>window.pendingFrames())).toBe(0);
  expect(await root.textContent()).not.toMatch(/NaN|Infinity/);
});
for(const [width,height] of sizes)test(`custom responsive ${width}×${height}: editing, graphs, car and orientation state`,async({page},info)=>{
  await page.setViewportSize({width,height});
  for(const n of [1,2]){
    const root=await custom(page,n);await numeric(root,1,'y',25);
    const before=await root.locator('[data-output="summary"]').textContent();
    const geometry=await root.evaluate(root=>{
      const visible=[...root.querySelectorAll('button,input,select,canvas:not(.profile-preview)')].filter(n=>n.getClientRects().length);
      const road=root.querySelector('.road').getBoundingClientRect(),car=root.querySelector('[id$="-carContainer"]').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,bad:visible.filter(n=>{const b=n.getBoundingClientRect();return b.left<0||b.right>innerWidth||b.width<=0;}).map(n=>n.outerHTML),carFits:car.left>=road.left&&car.right<=road.right,
        nodes:[...root.querySelectorAll('.graph-node')].map(n=>({width:n.clientWidth,height:n.clientHeight})),graphs:[...root.querySelectorAll('canvas:not(.profile-preview)')].map(n=>({width:n.clientWidth,height:n.clientHeight,dpi:n.width/n.clientWidth}))};
    });
    expect(geometry.overflow).toBe(false);expect(geometry.bad).toEqual([]);expect(geometry.carFits).toBe(true);expect(geometry.nodes.every(n=>n.width>=44&&n.height>=44)).toBe(true);expect(geometry.graphs.every(g=>g.width>200&&g.height>=145&&g.dpi>1.9)).toBe(true);
    await page.screenshot({path:info.outputPath(`custom-${n}-${width}.png`),fullPage:true});
    await page.setViewportSize({width:height,height:width});await expect(root.locator('[data-output="summary"]')).toHaveText(before);await expect(root.locator('[data-action="undo"]')).toBeEnabled();await page.setViewportSize({width,height});
  }
});
for(const n of [1,2])test(`custom accessibility ${n}: named editing, summary, focus, expanded panels and axe`,async({page})=>{
  const root=await custom(page,n);await root.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
  await expect(root.locator('[data-output="summary"]')).toContainText('4 points');
  const node=root.locator('.graph-node').nth(1);await node.focus();await expect(node).toBeFocused();await expect(node).toHaveCSS('outline-style','solid');
  const input=root.getByRole('spinbutton',{name:n===1?'Point B position in m':'Point B velocity in m/s',exact:true});await input.fill('30');await input.press('Shift+Tab');
  await expect(root.locator('[data-output="announcement"]')).toContainText('30');
  const audit=await new AxeBuilder({page}).analyze();expect(audit.violations).toEqual([]);
  const duplicates=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,ids)=>ids.indexOf(id)!==i));expect(duplicates).toEqual([]);
});
for(const n of [1,2])test(`custom ${n}: snap matches visible ticks; drag and numeric edits produce identical physics`,async({page})=>{
  const root=await custom(page,n), node=root.locator('.graph-node').nth(1), prefix=`#sim${n}-`;
  await node.scrollIntoViewIfNeeded();const box=await node.boundingBox();
  const snapText=await root.locator('[data-output="selection"]').textContent();
  const steps=snapText.match(/ticks: ([\d.]+) s, ([\d.]+)/).slice(1).map(Number);
  await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();await page.mouse.move(box.x+32,box.y-12,{steps:10});await page.mouse.up();
  const values=await node.getAttribute('aria-label'), coords=values.match(/: ([\d.-]+) seconds, ([\d.-]+)/).slice(1).map(Number);
  expect(coords[0]/steps[0]).toBeCloseTo(Math.round(coords[0]/steps[0]),5);expect(coords[1]/steps[1]).toBeCloseTo(Math.round(coords[1]/steps[1]),5);
  await page.locator(prefix+'timeScrubber').fill('2');const dragged=await page.locator(prefix+'liveState').textContent();
  await root.locator('[data-action="undo"]').click();await numeric(root,1,'t',coords[0]);await numeric(root,1,'y',coords[1]);
  await expect(page.locator(prefix+'liveState')).toHaveText(dragged);
});
test('custom VTAT reversal: negative area, exact distance, car reversal and rapid edits',async({page})=>{
  const root=await custom(page,2);
  await root.locator('.graph-node').nth(1).focus();await root.locator('[data-action="delete"]').click();await root.locator('[data-action="delete"]').click();
  await numeric(root,0,'y',10);await numeric(root,1,'y',-10);await numeric(root,1,'t',10);
  await page.locator('#sim2-timeScrubber').fill('5');await expect(page.locator('#sim2-live-velocity')).toHaveText('0.00 m s⁻¹');
  await page.locator('#sim2-timeScrubber').fill('6');await expect(page.locator('#sim2-carSVG')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)');
  await page.locator('#sim2-timeScrubber').fill('10');await expect(page.locator('#sim2-live-distance')).toHaveText('50.00 m');await expect(page.locator('#sim2-live-displacement')).toHaveText('0.00 m');
  await page.locator('#sim2-areaPanel summary').click();await expect(page.locator('#sim2-velocityAreaResult')).toContainText('negative contribution -25.00 m');
  await page.locator('#sim2-areaMode').selectOption('distance');await expect(page.locator('#sim2-velocityAreaResult')).toContainText('distance = ∫|v| dt = 50.00 m');
  await root.locator('.graph-node').first().focus();for(let i=0;i<20;i++)await page.keyboard.press(i%2?'ArrowDown':'ArrowUp');
  await expect.poll(()=>page.evaluate(()=>window.pendingFrames())).toBe(0);expect(await root.textContent()).not.toMatch(/NaN|Infinity/);
});
