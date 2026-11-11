import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

test.use({ reducedMotion: 'reduce' });

test('statistics navigation, sorting, filters, Markdown images and nested details work', async ({ page, request }) => {
  await page.goto('/stock/');
  const background = await page.locator('.site-background').getAttribute('style');
  const stockSpacing = await page.locator('.article-list article').first().evaluate((card) => ({
    padding: getComputedStyle(card).paddingBlock,
    gap: getComputedStyle(card.parentElement!).rowGap,
  }));
  const nav = page.locator('nav');
  const hrefs = await nav.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const stockIndex = hrefs.indexOf('/stock/');
  expect(hrefs.slice(stockIndex, stockIndex + 3)).toEqual(['/stock/', '/statistics/', '/drawing/']);
  await nav.getByRole('link', { name: '相信数学', exact: true }).click();
  await expect(page).toHaveURL(/\/statistics\/$/);
  await expect(nav.getByRole('link', { name: '相信数学', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main h1')).toHaveText('相信数学');
  await expect(page.locator('.site-background')).toHaveAttribute('style', background!);
  await expect(page.locator('article h2 a').first()).toHaveText('Browser statistics note');
  expect(await page.locator('.article-list article').first().evaluate((card) => ({
    padding: getComputedStyle(card).paddingBlock,
    gap: getComputedStyle(card.parentElement!).rowGap,
  }))).toEqual(stockSpacing);
  await expect(page.locator('article[data-category="统计研究"] a[href="/statistics/folder/2099-01-01-nested/"]')).toHaveCount(1);
  await expect(page.getByText('Unpublished statistics', { exact: true })).toHaveCount(0);

  const select = page.getByRole('combobox', { name: '分类' });
  const total = await page.locator('article[data-category]').count();
  await select.selectOption('Browser statistics');
  await expect(page.locator('article[data-category]:visible')).toHaveCount(1);
  await expect(page).toHaveURL(/category=Browser/);
  await page.reload();
  await expect(select).toHaveValue('Browser statistics');
  await page.getByRole('link', { name: 'Browser statistics note', exact: true }).click();
  await expect(page).toHaveURL(/\/statistics\/browser-fixture\/$/);
  await expect(page.locator('.prose img')).toHaveAttribute('src', /^\/resource\/.+\.svg$/);
  const image = await page.locator('.prose img').getAttribute('src');
  expect((await request.get(image!)).ok()).toBe(true);
  await expect(page.getByRole('link', { name: 'Stock note', exact: true })).toHaveAttribute('href', '/stock/browser-fixture/');
  await expect(page.locator('.back-link')).toHaveAttribute('href', '/statistics/');
  await page.locator('.back-link').click();
  await expect(page.locator('article[data-category]:visible')).toHaveCount(total);
  await page.locator('article a[href="/statistics/folder/2099-01-01-nested/"]').click();
  await expect(page).toHaveURL(/\/statistics\/folder\/2099-01-01-nested\/$/);
  expect((await request.get('/statistics/browser-draft/')).status()).toBe(404);
});

test('statistics cards wrap without overlap or horizontal overflow at desktop and mobile widths', async ({ page }) => {
  await page.goto('/statistics/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1600, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const problems = await page.locator('.article-list article').evaluateAll((cards) => cards.flatMap((card, index) => {
      const bounds = card.getBoundingClientRect();
      const children = [...card.children].map((child) => child.getBoundingClientRect());
      const overlap = children.some((child, i) => i > 0 && child.top < children[i - 1].bottom - .5);
      const outside = children.some((child) => child.top < bounds.top || child.bottom > bounds.bottom || child.left < bounds.left || child.right > bounds.right);
      return overlap || outside || card.scrollWidth > card.clientWidth + 1 ? [index] : [];
    }));
    expect(problems, `Card layout at ${width}px`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page width at ${width}px`).toBe(true);
    const header = await page.locator('.site-header').boundingBox();
    const heading = await page.locator('main h1').boundingBox();
    expect(heading!.y, `Heading below the navigation at ${width}px`).toBeGreaterThanOrEqual(header!.y + header!.height);
  }
});

test('statistics Markdown and its images refresh after additions, changes and removal', async ({ page, request }) => {
  test.setTimeout(60000);
  const { root } = JSON.parse(readFileSync('.cache/browser-fixture.json', 'utf8'));
  const note = path.resolve(root, 'resource/statistics/browser-watcher.md');
  const image = path.resolve(root, 'resource/images/statistics/browser-watcher.svg');
  expect(note.startsWith(path.resolve(root, 'resource/statistics') + path.sep)).toBe(true);
  expect(image.startsWith(path.resolve(root, 'resource/images/statistics') + path.sep)).toBe(true);
  const svg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${color}"/></svg>`;
  const url = '/statistics/browser-watcher/';
  await page.goto('/statistics/');
  try {
    writeFileSync(image, svg('purple'));
    writeFileSync(note, '# Added statistics study\n\n![Watched distribution](../images/statistics/browser-watcher.svg)');
    await expect(page.getByRole('link', { name: 'Added statistics study', exact: true })).toBeVisible({ timeout: 20000 });
    await page.getByRole('link', { name: 'Added statistics study', exact: true }).click();
    const before = await page.locator('.prose img').getAttribute('src');
    expect(before).toBeTruthy();
    writeFileSync(image, svg('orange'));
    await expect(page.locator('.prose img')).not.toHaveAttribute('src', before!, { timeout: 20000 });
    const updated = await page.locator('.prose img').getAttribute('src');
    expect((await request.get(updated!)).ok()).toBe(true);
    writeFileSync(note, '# Updated statistics study\n\nUpdated study text.');
    await expect(page.locator('.prose h1').first()).toHaveText('Updated statistics study', { timeout: 20000 });
    await page.goto('/statistics/');
    rmSync(note);
    await expect(page.getByRole('link', { name: 'Updated statistics study', exact: true })).toHaveCount(0, { timeout: 20000 });
    await expect.poll(async () => (await request.get(url)).status(), { timeout: 20000 }).toBe(404);
  } finally {
    rmSync(note, { force: true });
    rmSync(image, { force: true });
  }
});
