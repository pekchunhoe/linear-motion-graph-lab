import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STVT_PROFILES } from '../js/motion-profiles/stvt-profiles.js';
import { VTAT_PROFILES } from '../js/motion-profiles/vtat-profiles.js';
import { PROFILE_CATEGORY_ORDER } from '../js/shared/profile-browser.js';

const families = [Object.values(STVT_PROFILES), Object.values(VTAT_PROFILES)];
const viewports = [[320,568],[360,640],[375,667],[390,844],[412,915],[768,1024],[820,1180],[1024,768],[1180,820],[1366,768],[1440,900]];

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') page.errors.push(message.text()); });
  await page.goto('/');
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

test('desktop graph libraries group every profile once, use sharp real previews and synchronize selection', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  for (const profiles of families) {
    const id = profiles[0].id, root = page.locator(`#sim${id}`), prefix = `#sim${id}-`;
    await page.locator(`#tab${id}`).click();
    await expect(root.locator('.profile-browser')).toBeVisible();
    await expect(root.locator('.profile-category')).toHaveCount(PROFILE_CATEGORY_ORDER.length);
    await expect(root.locator('.profile-category .profile-category-title').allTextContents()).resolves.toEqual(PROFILE_CATEGORY_ORDER);
    await expect(root.locator('.profile-card')).toHaveCount(profiles.length);
    await expect(root.locator('.profile-card')).toHaveCount(new Set(profiles.map(profile => profile.profileId)).size);
    const previews = await root.locator('.profile-preview').evaluateAll(nodes => nodes.map(canvas => ({
      width: canvas.clientWidth, height: canvas.clientHeight, backingWidth: canvas.width, backingHeight: canvas.height
    })));
    expect(previews.every(preview => preview.width > 70 && preview.height > 30 && preview.backingWidth <= Math.ceil(preview.width * 2) && preview.backingHeight <= Math.ceil(preview.height * 2))).toBe(true);

    const dropdownProfile = profiles.at(-1);
    await page.locator(prefix + 'motionProfile').selectOption(dropdownProfile.profileId);
    const dropdownCard = root.locator(`.profile-card[data-profile-id="${dropdownProfile.profileId}"]`);
    await expect(dropdownCard).toHaveAttribute('aria-pressed','true');
    await expect(dropdownCard).toHaveClass(/is-selected/);
    await expect(page.locator(prefix + 'timeScrubber')).toHaveValue('0');
    await expect(page.locator(prefix + 'profileFocus')).toContainText(dropdownProfile.learningFocus);
    await page.locator(prefix + 'profileEquation summary').click();
    await expect(page.locator(prefix + 'profileEquationText')).toHaveText(dropdownProfile.equation);

    const cardProfile = profiles.find(profile => profile.profileId !== dropdownProfile.profileId);
    await page.locator(prefix + 'timeScrubber').fill(String(dropdownProfile.end));
    await root.locator(`.profile-card[data-profile-id="${cardProfile.profileId}"]`).click();
    await expect(page.locator(prefix + 'motionProfile')).toHaveValue(cardProfile.profileId);
    await expect(page.locator(prefix + 'timeScrubber')).toHaveValue('0');
    await expect(page.locator(prefix + 'durationLabel')).toHaveText(`${cardProfile.end} s`);
    await expect(page.locator(prefix + 'profileDescription')).toHaveText(cardProfile.description);
    await expect(root.locator(`.profile-card[data-profile-id="${cardProfile.profileId}"]`)).toHaveAttribute('aria-pressed','true');
    await expect(root.locator(`.profile-card[data-profile-id="${dropdownProfile.profileId}"]`)).toHaveAttribute('aria-pressed','false');
  }
});

test('phone keeps the compact select close to the simulation and opens an accessible browse library', async ({ page }) => {
  await page.setViewportSize({width:320,height:568});
  for (const profiles of families) {
    const id = profiles[0].id, root = page.locator(`#sim${id}`), prefix = `#sim${id}-`;
    await page.locator(`#tab${id}`).click();
    const browser = root.locator('.profile-browser');
    await expect(page.locator(prefix + 'motionProfile')).toBeVisible();
    await expect(page.locator(prefix + 'browseProfiles')).toBeVisible();
    await expect(browser).toBeHidden();
    const closed = await root.evaluate(node => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      picker: node.querySelector('.profile-picker').getBoundingClientRect(),
      toolbar: node.querySelector('.toolbar').getBoundingClientRect()
    }));
    expect(closed.overflow).toBe(false);
    expect(closed.toolbar.top - closed.picker.bottom).toBeLessThan(12);

    for (const profile of profiles) {
      await page.locator(prefix + 'browseProfiles').click();
      await expect(browser).toBeVisible();
      const card = root.locator(`.profile-card[data-profile-id="${profile.profileId}"]`);
      await card.focus(); await page.keyboard.press('Enter');
      await expect(page.locator(prefix + 'motionProfile')).toHaveValue(profile.profileId);
      await expect(page.locator(prefix + 'timeScrubber')).toHaveValue('0');
      await expect(card).toHaveAttribute('aria-pressed','true');
      await expect(browser).toBeHidden();
      await expect(page.locator(prefix + 'browseProfiles')).toBeFocused();
    }
    await page.locator(prefix + 'browseProfiles').click();
    await expect(browser).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(browser).toBeHidden();
    await expect(page.locator(prefix + 'browseProfiles')).toBeFocused();
    expect(await root.evaluate(node => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});

test('card selection preserves predict and challenge behavior through orientation changes', async ({ page }) => {
  await page.setViewportSize({width:1180,height:820});
  for (const profiles of families) {
    const id = profiles[0].id, root = page.locator(`#sim${id}`), prefix = `#sim${id}-`;
    const selected = profiles.find(profile => profile.profileId === 'reverse');
    await page.locator(`#tab${id}`).click();
    await root.locator(`.profile-card[data-profile-id="${selected.profileId}"]`).click();
    await page.locator(prefix + 'timeScrubber').fill('3');
    await page.locator(prefix + 'predictionActivity summary').click();
    await page.locator(prefix + 'predictBtn').click();
    await expect(page.locator(prefix + 'derivedGraph')).toBeHidden();
    await page.setViewportSize({width:390,height:844});
    await page.setViewportSize({width:1180,height:820});
    await expect(page.locator(prefix + 'motionProfile')).toHaveValue(selected.profileId);
    await expect(root.locator(`.profile-card[data-profile-id="${selected.profileId}"]`)).toHaveAttribute('aria-pressed','true');
    await expect(page.locator(prefix + 'timeScrubber')).toHaveValue('3');
    await expect(page.locator(prefix + 'derivedGraph')).toBeHidden();
    await page.locator(prefix + 'predictBtn').click();
    await page.locator(prefix + 'challenges summary').click();
    await expect(page.locator(prefix + 'challengeQuestion')).toHaveAttribute('aria-label', new RegExp(selected.title));
  }
});

for (const [width, height] of viewports) test(`profile browser layout ${width}×${height} remains contained and compact`, async ({ page }) => {
  await page.setViewportSize({width,height});
  for (const profiles of families) {
    const id = profiles[0].id, root = page.locator(`#sim${id}`), prefix = `#sim${id}-`;
    await page.locator(`#tab${id}`).click();
    if (width <= 900) await page.locator(prefix + 'browseProfiles').click();
    await expect(root.locator('.profile-browser')).toBeVisible();
    const geometry = await root.evaluate(node => {
      const browser = node.querySelector('.profile-browser').getBoundingClientRect();
      const cards = [...node.querySelectorAll('.profile-card')].map(card => card.getBoundingClientRect());
      const controls = [...node.querySelectorAll('button,select,input')].filter(control => control.getClientRects().length).map(control => control.getBoundingClientRect());
      return { overflow: document.documentElement.scrollWidth > innerWidth, browser, cards, controls };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.cards.every(card => card.width >= 100 && card.right <= width && card.left >= 0)).toBe(true);
    expect(geometry.controls.every(control => control.width > 0 && control.right <= width && control.left >= 0)).toBe(true);
    if (width >= 901) expect(geometry.browser.height).toBeLessThan(390);
  }
});

test('profile cards, browser button and equation disclosure pass automated accessibility checks', async ({ page }) => {
  await page.setViewportSize({width:320,height:568});
  for (const id of [1,2]) {
    await page.locator(`#tab${id}`).click();
    await page.locator(`#sim${id}-browseProfiles`).click();
    await page.locator(`#sim${id}-profileEquation summary`).click();
    const results = await new AxeBuilder({page}).include(`#sim${id}`).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});
