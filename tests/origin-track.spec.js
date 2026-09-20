import { test, expect } from '@playwright/test';

const sizes = [[320,568],[360,640],[375,667],[390,844],[412,915],[768,1024],[820,1180],[1024,768],[1180,820],[1366,768],[1440,900]];

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') page.errors.push(message.text()); });
  await page.goto('/');
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

async function expectOriginAligned(page, simulation) {
  const root = page.locator(`#sim${simulation}`);
  const origin = root.locator('.origin-marker');
  await expect(origin).toBeVisible();
  await expect(origin).toHaveAttribute('aria-label', 'Origin, s equals zero');
  const geometry = await root.evaluate(root => {
    const road = root.querySelector('.road').getBoundingClientRect();
    const car = root.querySelector('[id$="-carContainer"]');
    const origin = root.querySelector('.origin-marker');
    const markerStyle = getComputedStyle(origin);
    const tickStyle = getComputedStyle(origin, '::before');
    return { road, car: Number.parseFloat(car.style.left), origin: Number.parseFloat(origin.style.left), label: root.querySelector('.road').getAttribute('aria-label'),
      text: origin.textContent, weight: Number(markerStyle.fontWeight), tickWidth: Number.parseFloat(tickStyle.borderLeftWidth) };
  });
  expect(geometry.car).toBeCloseTo(geometry.origin, 4);
  expect(geometry.origin).toBeGreaterThanOrEqual(0);
  expect(geometry.origin).toBeLessThanOrEqual(geometry.road.width);
  expect(geometry.label).toContain('Origin at s = 0 is marked on the track.');
  expect(geometry.text).toContain('s = 0');
  expect(geometry.weight).toBeGreaterThanOrEqual(700);
  expect(geometry.tickWidth).toBeGreaterThanOrEqual(3);
}

test('STVT and VTAT presets visibly mark and align the origin at s = 0', async ({ page }) => {
  await expectOriginAligned(page, 1);
  await page.locator('#tab2').click();
  await expectOriginAligned(page, 2);
});

test('the shared DOM marker helper omits origin when the existing road range excludes zero', async ({ page }) => {
  const markerData = await page.evaluate(async () => {
    const { mountTrackMarkers } = await import('/js/shared/motion-track.js');
    const container = document.createElement('div');
    const result = mountTrackMarkers(container, [30, 80], [30, 50, 80]);
    return { visible: result.originVisible, originCount: container.querySelectorAll('.origin-marker').length,
      ticks: [...container.querySelectorAll('.mark')].map(mark => mark.dataset.position) };
  });
  expect(markerData).toEqual({ visible: false, originCount: 0, ticks: ['30', '50', '80'] });
});

test('STVT and VTAT custom graphs retain the shared origin marker and update it with their model', async ({ page }) => {
  for (const simulation of [1, 2]) {
    await page.locator(`#tab${simulation}`).click();
    const root = page.locator(`#sim${simulation}`);
    await root.getByRole('button', { name: 'Custom graph', exact: true }).click();
    await expectOriginAligned(page, simulation);
    await root.locator('.custom-builder details').first().locator('summary').click();
    const value = root.locator('.point-table [data-index="1"][data-field="y"]');
    await value.fill(simulation === 1 ? '-20' : '-12'); await value.press('Tab');
    await page.locator(`#sim${simulation}-timeScrubber`).fill('4');
    await expect(root.locator('.road')).toHaveAttribute('aria-label', /left of the origin/);
  }
});

for (const [width, height] of sizes) test(`origin marker ${width}×${height}: contained, readable and aligned`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  for (const simulation of [1, 2]) {
    await page.locator(`#tab${simulation}`).click();
    await expectOriginAligned(page, simulation);
    const geometry = await page.locator(`#sim${simulation}`).evaluate(root => {
      const road = root.querySelector('.road').getBoundingClientRect();
      const origin = root.querySelector('.origin-marker').getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, road, origin };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.origin.left).toBeGreaterThanOrEqual(geometry.road.left - 1);
    expect(geometry.origin.right).toBeLessThanOrEqual(geometry.road.right + 1);
  }
});
