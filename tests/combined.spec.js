import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { COMBINED_PROFILES } from '../js/combined/profiles.js';
const sizes = [[320,568],[360,640],[375,667],[390,844],[412,915],[768,1024],[820,1180],[1024,768],[1180,820],[1366,768],[1440,900]];
const rootFor = page => page.locator('#sim3');
const control = (page, name) => page.locator(`#sim3-${name}`);
const visibleBuilder = page => rootFor(page).locator('.custom-builder:visible');
async function custom(page, family = 1) {
  await rootFor(page).getByRole('button', { name:'Custom graph', exact:true }).click();
  await control(page,'buildSource').selectOption(String(family));
}
async function edit(page, point, field, value) {
  const drawer = rootFor(page).locator('.builder-drawer:visible');
  const details = drawer.locator('details').first();
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  const input=drawer.locator(`[data-index="${point}"][data-field="${field}"]`);
  await input.fill(String(value)); await input.press('Tab');
}
async function triangle(page, family) {
  await custom(page,family);
  await rootFor(page).locator('.graph-nodes:visible .graph-node').last().focus();
  await visibleBuilder(page).getByRole('button',{name:'Delete point',exact:true}).click();
  await edit(page,1,'t',5);await edit(page,2,'t',10);
  await edit(page,1,'y',family===1?20:10);await edit(page,2,'y',family===1?20:0);
}
async function setInitial(page, value) {
  const input=visibleBuilder(page).locator('[data-control="initialPosition"]');
  await input.fill(String(value));await input.press('Tab');
}
async function open(page,id) {
  if (await control(page,id).getAttribute('open') === null) await control(page,id).locator('summary').click();
}
test.beforeEach(async({page})=>{
  page.errors=[];
  page.on('pageerror',error=>page.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')page.errors.push(message.text());});
  await page.addInitScript(()=>{
    const request=window.requestAnimationFrame,cancel=window.cancelAnimationFrame,pending=new Set();
    window.pendingFrames=()=>pending.size;
    window.requestAnimationFrame=callback=>{const id=request.call(window,t=>{pending.delete(id);callback(t);});pending.add(id);return id;};
    window.cancelAnimationFrame=id=>{pending.delete(id);cancel.call(window,id);};
    // Capture the actual canvas cursor strokes, rather than trusting DOM widths.
    const prototype=CanvasRenderingContext2D.prototype;
    const move=prototype.moveTo,stroke=prototype.stroke,fill=prototype.fillRect;
    prototype.moveTo=function(x,y){this.lastMove=[x,y];return move.call(this,x,y);};
    prototype.stroke=function(){
      if(this.getLineDash().join(',')==='3,4')this.canvas.cursorX=this.lastMove[0];
      return stroke.call(this);
    };
    prototype.fillRect=function(x,y,w,h){
      // Graph uses fillRect for the interval overlay; browsers normalize its
      // translucent fillStyle to different string formats.
      this.canvas.highlightRange=[x,w];
      return fill.call(this,x,y,w,h);
    };
  });
  await page.goto('/');await page.locator('#tab3').click();
});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));

for(const model of Object.values(COMBINED_PROFILES)) test(`combined preset ${model.profileId}: all graphs, live physics, browser selection`,async({page})=>{
  await control(page,'motionProfile').selectOption(model.profileId);
  const t=model.segments[0].end/2,state=model.stateAt(t);
  await control(page,'timeScrubber').fill(String(t));
  for(const [key,unit] of [['position','m'],['velocity','m s⁻¹'],['acceleration','m s⁻²'],['displacement','m'],['distance','m']])
    await expect(control(page,'live-'+key)).toHaveText(`${state[key].toFixed(2)} ${unit}`);
  await expect(rootFor(page).locator('.graph-card canvas:visible')).toHaveCount(3);
  if(await control(page,'browseProfiles').isVisible())await control(page,'browseProfiles').click();
  await expect(rootFor(page).locator('.profile-card')).toHaveCount(10);
  await expect(rootFor(page).locator('.profile-card.is-selected')).toContainText(model.shortTitle);
  await open(page,'profileEquation');await expect(control(page,'profileEquationText')).toHaveText(model.equation);
  await rootFor(page).locator('.profile-card').first().click();
  await expect(control(page,'motionProfile')).toHaveValue(Object.keys(COMBINED_PROFILES)[0]);
});

test('combined custom position: corners, both tangents, jump area, smooth and history',async({page})=>{
  await triangle(page,1);await control(page,'timeScrubber').fill('2.5');
  await expect(control(page,'live-position')).toHaveText('10.00 m');
  await expect(control(page,'live-velocity')).toHaveText('4.00 m s⁻¹');
  await expect(control(page,'live-acceleration')).toHaveText('0.00 m s⁻²');
  await control(page,'timeScrubber').fill('5');
  await expect(control(page,'live-velocity')).toHaveText('Undefined');
  await expect(control(page,'live-acceleration')).toHaveText('Undefined');
  await expect(control(page,'primaryReadout')).toContainText('undefined');
  await expect(control(page,'derivedReadout')).toContainText('velocity jump');
  await open(page,'areaPanel');await control(page,'accelerationArea').check();
  await expect(control(page,'accelerationAreaResult')).toContainText('finite acceleration area alone cannot');
  await control(page,'timeScrubber').fill('10');
  await expect(control(page,'velocityAreaResult')).toContainText('Δs = ∫v dt = 20.00 m');
  await visibleBuilder(page).locator('[data-control="style"]').selectOption('smooth');
  await control(page,'timeScrubber').fill('5');await expect(control(page,'live-velocity')).toHaveText('0.00 m s⁻¹');
  await expect(control(page,'accelerationAreaResult')).not.toContainText('velocity change');
  await visibleBuilder(page).getByRole('button',{name:'Undo',exact:true}).click();
  await expect(control(page,'live-velocity')).toHaveText('Undefined');
  await visibleBuilder(page).getByRole('button',{name:'Redo',exact:true}).click();
  await expect(control(page,'live-velocity')).toHaveText('0.00 m s⁻¹');
});

test('combined custom velocity: quadratic position, initial position, origin and history',async({page})=>{
  await triangle(page,2);await control(page,'timeScrubber').fill('10');
  await expect(control(page,'live-position')).toHaveText('50.00 m');
  await expect(control(page,'live-distance')).toHaveText('50.00 m');
  const before=await control(page,'carContainer').evaluate(node=>node.style.left);
  await setInitial(page,30);
  await expect(control(page,'timeScrubber')).toHaveValue('10');
  await expect(control(page,'live-position')).toHaveText('80.00 m');
  await expect(control(page,'live-displacement')).toHaveText('50.00 m');
  await expect(control(page,'live-distance')).toHaveText('50.00 m');
  await expect(control(page,'live-velocity')).toHaveText('0.00 m s⁻¹');
  await expect(control(page,'live-acceleration')).toHaveText('-2.00 m s⁻²');
  expect(await control(page,'carContainer').evaluate(node=>node.style.left)).not.toBe(before);
  await visibleBuilder(page).getByRole('button',{name:'Undo',exact:true}).click();
  await expect(control(page,'live-position')).toHaveText('50.00 m');
  await visibleBuilder(page).getByRole('button',{name:'Redo',exact:true}).click();
  await expect(control(page,'live-position')).toHaveText('80.00 m');
  await setInitial(page,-25);await control(page,'timeScrubber').fill('5');
  await expect(control(page,'live-position')).toHaveText('0.00 m');
  const alignment=await rootFor(page).evaluate(root=>{
    const car=root.querySelector('[id$="-carContainer"]').getBoundingClientRect();
    const origin=root.querySelector('.origin-marker').getBoundingClientRect();
    return Math.abs(car.x+car.width/2-origin.x-origin.width/2);
  });expect(alignment).toBeLessThan(.1);
  await expect(rootFor(page).locator('.road')).toHaveAttribute('aria-label',/car is at the origin/);
  await setInitial(page,1001);await expect(visibleBuilder(page).locator('[role="alert"]')).toContainText('between');
  await expect(control(page,'live-position')).toHaveText('0.00 m');
});

test('combined custom velocity: reversal, graph turning point and car facing',async({page})=>{
  await custom(page,2);
  for(let i=0;i<2;i++){
    await rootFor(page).locator('.graph-nodes:visible .graph-node').last().focus();
    await visibleBuilder(page).getByRole('button',{name:'Delete point',exact:true}).click();
  }
  await edit(page,1,'t',10);await edit(page,0,'y',10);await edit(page,1,'y',-10);
  await control(page,'timeScrubber').fill('5');
  await expect(control(page,'live-position')).toHaveText('25.00 m');await expect(control(page,'live-velocity')).toHaveText('0.00 m s⁻¹');
  await control(page,'timeScrubber').fill('4');await expect(control(page,'carSVG')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await control(page,'timeScrubber').fill('6');await expect(control(page,'carSVG')).toHaveCSS('transform','matrix(-1, 0, 0, 1, 0, 0)');
  await control(page,'timeScrubber').fill('10');
  await expect(control(page,'live-displacement')).toHaveText('0.00 m');await expect(control(page,'live-distance')).toHaveText('50.00 m');
});

test('combined preserves preset, both drafts, settings, times and all three tab states',async({page})=>{
  await control(page,'motionProfile').selectOption('reverse');await control(page,'timeScrubber').fill('3');
  await control(page,'playbackSpeed').selectOption('2');
  await custom(page,1);await edit(page,1,'y',31);await control(page,'timeScrubber').fill('2');
  await visibleBuilder(page).locator('[data-control="style"]').selectOption('smooth');
  await control(page,'buildSource').selectOption('2');await edit(page,1,'y',9);await setInitial(page,30);await control(page,'timeScrubber').fill('6');
  await rootFor(page).getByRole('button',{name:'Preset graphs',exact:true}).click();
  await expect(control(page,'motionProfile')).toHaveValue('reverse');await expect(control(page,'timeScrubber')).toHaveValue('3');
  await custom(page,1);await expect(visibleBuilder(page).locator('[data-control="style"]')).toHaveValue('smooth');
  await expect(control(page,'timeScrubber')).toHaveValue('2');
  await expect(visibleBuilder(page).locator('[data-output="summary"]')).toContainText('31 m');
  await control(page,'buildSource').selectOption('2');await expect(control(page,'timeScrubber')).toHaveValue('6');
  await expect(visibleBuilder(page).locator('[data-control="initialPosition"]')).toHaveValue('30');
  for(const n of [1,2]) {await page.locator('#tab'+n).click();await page.locator(`#sim${n}-timeScrubber`).fill(String(n));}
  for(const n of [3,1,2,3])await page.locator('#tab'+n).click();
  await expect(control(page,'timeScrubber')).toHaveValue('6');await expect(control(page,'playbackSpeed')).toHaveValue('2');
  await expect(page.locator('#sim1-timeScrubber')).toHaveValue('1');await expect(page.locator('#sim2-timeScrubber')).toHaveValue('2');
});

for(const family of [1,2])test(`combined source ${family}: staged prediction, keyboard editing, challenges and linked interval`,async({page})=>{
  await custom(page,family);await open(page,'predictionActivity');await control(page,'predictBtn').click();
  const source=family===1?'positionCanvas':'velocityCanvas',target=family===1?'velocityCanvas':'positionCanvas';
  await expect(control(page,source)).toBeVisible();await expect(control(page,target)).toBeHidden();await expect(control(page,'accCanvas')).toBeHidden();
  await control(page,'predictBtn').click();await expect(control(page,target)).toBeVisible();await expect(control(page,'accCanvas')).toBeHidden();
  await control(page,'predictBtn').click();await expect(control(page,'accCanvas')).toBeVisible();
  await visibleBuilder(page).locator('[data-control="snap"]').uncheck();
  const node=rootFor(page).locator('.graph-nodes:visible .graph-node').nth(1);await node.focus();await page.keyboard.press('ArrowUp');
  await expect(control(page,'timeScrubber')).toHaveValue('0');
  await expect(visibleBuilder(page).getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await open(page,'linkedInterval');await control(page,'highlightMode').check();
  await control(page,'highlightStart').fill('1');await control(page,'highlightEnd').fill('3');
  const ranges=await rootFor(page).locator('.graph-card canvas').evaluateAll(nodes=>nodes.map(c=>c.highlightRange));
  expect(ranges[0]).toEqual(ranges[1]);expect(ranges[1]).toEqual(ranges[2]);expect(ranges[0]?.[1]).toBeGreaterThan(0);
  await open(page,'challenges');await control(page,'challengeSelect').selectOption('1');await control(page,'challengeAnswer').fill('0');
  await control(page,'checkAnswer').click();await expect(control(page,'challengeFeedback')).toContainText('Correct');
});

test('combined playback: rapid three-tab switching leaves exactly one animation owner',async({page})=>{
  for(const n of [3,1,2,3,2,1,3]){
    await page.locator('#tab'+n).click();await page.locator(`#sim${n}-playBtn`).click();
    await expect.poll(()=>page.evaluate(()=>window.pendingFrames())).toBe(1);
    for(const other of [1,2,3].filter(i=>i!==n))await expect(page.locator(`#sim${other}-playbackStatus`)).not.toHaveText('Playing');
  }
  await control(page,'stopBtn').click();await expect.poll(()=>page.evaluate(()=>window.pendingFrames())).toBe(0);
});

for(const [width,height] of sizes)test(`combined responsive and pixel alignment ${width}×${height}`,async({page},info)=>{
  await page.setViewportSize({width,height});
  for(const mode of ['preset',1,2]){
    if(mode!=='preset')await custom(page,mode);
    for(const t of [0,1.23,6,12]){
      await control(page,'timeScrubber').fill(String(t));
      const xs=await rootFor(page).locator('.graph-card canvas').evaluateAll(nodes=>nodes.map(c=>c.getBoundingClientRect().left+c.cursorX));
      expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(.1);
    }
    const geometry=await rootFor(page).evaluate(root=>{
      const graphs=[...root.querySelectorAll('.graph-card')].map(n=>n.getBoundingClientRect());
      const road=root.querySelector('.road').getBoundingClientRect(),car=root.querySelector('[id$="-carContainer"]').getBoundingClientRect();
      const visible=[...document.querySelectorAll('[role="tab"],#sim3 button,#sim3 input,#sim3 select')].filter(n=>n.getClientRects().length);
      return {overflow:document.documentElement.scrollWidth>innerWidth,bad:visible.filter(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>innerWidth;}).map(n=>n.outerHTML),
        gaps:graphs.slice(1).map((r,i)=>r.top-graphs[i].bottom),carFits:car.left>=road.left&&car.right<=road.right};
    });
    expect(geometry.overflow).toBe(false);expect(geometry.bad).toEqual([]);expect(geometry.carFits).toBe(true);
    expect(geometry.gaps.every(g=>g>=0&&g<=8)).toBe(true);
    if([320,1440].includes(width))await page.screenshot({path:info.outputPath(`combined-${mode}-${width}.png`),fullPage:true});
  }
});

for(const mode of ['preset',1,2])test(`combined accessibility ${mode}: axe, numeric labels and complete tab names`,async({page})=>{
  await page.setViewportSize({width:320,height:568});
  if(mode!=='preset'){await custom(page,mode);await edit(page,1,'y',25);}
  await open(page,'challenges');await open(page,'areaPanel');
  const results=await new AxeBuilder({page}).analyze();expect(results.violations).toEqual([]);
  await expect(page.getByRole('tab',{name:'Position to Velocity to Acceleration',exact:true})).toHaveAttribute('aria-selected','true');
  if(mode===2)await expect(rootFor(page).getByLabel('Initial position s₀ (m)')).toBeVisible();
});
