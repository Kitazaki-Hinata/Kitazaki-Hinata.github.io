import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';

test('skin desktop double-click, original loading, zoom/pan, switching and focus restoration', async ({ page }) => {
  await page.goto('/osu_skin/browser-fixture/');
  const thumbnail = page.locator('[data-gallery-image]').first();
  await expect(page.locator('[data-gallery]')).toHaveAttribute('data-initialized', 'true');
  await expect(thumbnail.locator('img')).toHaveAttribute('srcset', /400w.*800w.*1200w/);
  const original = await thumbnail.getAttribute('href');
  const loadedBefore = await page.evaluate((url) => performance.getEntriesByType('resource').some((entry) => entry.name.endsWith(url!)), original);
  expect(loadedBefore).toBe(false);
  await thumbnail.click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await thumbnail.dblclick();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('[data-viewer-image]')).toBeVisible();
  await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', new RegExp(original!));
  await expect(page.locator('[data-viewer-zoom]')).toHaveText('100%');
  await page.getByRole('button', { name: '放大', exact: true }).click();
  await expect(page.locator('[data-viewer-zoom]')).toHaveText('125%');
  const viewport = page.locator('.viewer-viewport');
  await viewport.hover();
  await page.mouse.wheel(0, -500);
  await expect(page.locator('[data-viewer-zoom]')).not.toHaveText('125%');
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2, { steps: 5 }); await page.mouse.up();
  const bounds = await page.locator('[data-viewer-image]').evaluate((img) => {
    const viewport = img.parentElement!.getBoundingClientRect(), image = img.getBoundingClientRect();
    return { left: image.left <= viewport.left + 1, right: image.right >= viewport.right - 1 };
  });
  expect(bounds).toEqual({ left: true, right: true });
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-viewer-counter]')).toHaveText('2 / 2');
  await expect(page.locator('[data-viewer-image]')).toBeVisible();
  await expect(page.locator('[data-viewer-zoom]')).toHaveText('100%');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(thumbnail).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await thumbnail.press('Enter');
  await expect(page.locator('dialog')).toBeVisible();
});

test('drawing opens with one click and failed images retain close/navigation controls', async ({ page }) => {
  await page.goto('/drawing/');
  const thumbnail = page.locator('[data-gallery-image][data-title="Browser fixture drawing"]');
  const url = await thumbnail.getAttribute('href');
  await page.route('**' + url, (route) => route.abort());
  await thumbnail.click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('[data-viewer-status]')).toContainText('加载失败');
  await page.getByRole('button', { name: '关闭（Esc）' }).click();
  await expect(thumbnail).toBeFocused();
});

test('mobile tapping and two-finger pinch zoom work', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4329/osu_skin/browser-fixture/');
  await page.locator('[data-gallery-image]').first().tap();
  await expect(page.locator('[data-viewer-image]')).toBeVisible();
  const box = (await page.locator('.viewer-viewport').boundingBox())!;
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 30, y, id: 1 }, { x: x + 30, y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 80, y, id: 1 }, { x: x + 80, y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('[data-viewer-zoom]')).not.toHaveText('100%');
  await page.getByRole('button', { name: '适应窗口' }).click();
  await expect(page.locator('[data-viewer-zoom]')).toHaveText('100%');
  await context.close();
});

test('categories persist in URLs and handle history and unknown categories', async ({ page }) => {
  await page.goto('/stock/');
  const select = page.getByRole('combobox', { name: '分类' });
  const initial = await page.locator('article[data-category]:visible').count();
  await select.selectOption('Browser fixture');
  await expect(page.locator('article[data-category]:visible')).toHaveCount(1);
  await expect(page).toHaveURL(/category=Browser/);
  await page.reload(); await expect(select).toHaveValue('Browser fixture');
  await select.selectOption(''); await expect(page.locator('article[data-category]:visible')).toHaveCount(initial);
  await page.goBack(); await expect(select).toHaveValue('Browser fixture');
  await page.goto('/stock/?category=missing-category');
  await expect(page.locator('[data-filter-empty]')).toBeVisible();
  await expect(page.locator('article[data-category]:visible')).toHaveCount(0);
});

test('reading has its own sorted list, filters, nested details and draft exclusion', async ({ page, request }) => {
  await page.goto('/reading/');
  await expect(page.locator('nav').getByRole('link', { name: '读书与思考' })).toHaveAttribute('href', '/reading/');
  await expect(page.locator('nav').getByRole('link', { name: '找我&投喂' })).toHaveAttribute('href', '/contact/');
  await expect(page.locator('nav a[href="/projects/"]')).toHaveCount(0);
  await expect(page.locator('article h2 a').first()).toHaveText('Browser reading note');
  const select = page.getByRole('combobox', { name: '分类' });
  await select.selectOption('Browser reading');
  await expect(page.locator('article[data-category]:visible')).toHaveCount(1);
  await page.getByRole('link', { name: 'Browser reading note', exact: true }).click();
  await expect(page).toHaveURL(/\/reading\/browser-fixture\/$/);
  await expect(page.locator('.prose img')).toHaveAttribute('src', /^\/resource\//);
  await expect(page.getByRole('link', { name: 'Stock note', exact: true })).toHaveAttribute('href', '/stock/browser-fixture/');
  await page.getByRole('link', { name: '返回读书与思考' }).click();
  await page.getByRole('link', { name: 'Nested reading note', exact: true }).click();
  await expect(page).toHaveURL(/\/reading\/folder\/2099-01-01-nested\/$/);
  expect((await request.get('/reading/browser-draft/')).status()).toBe(404);
  expect((await request.get('/projects/')).status()).toBe(404);
  expect((await request.get('/projects/example-blog/')).status()).toBe(404);
});

test('contact displays two images with original viewing and the shared background', async ({ page }) => {
  await page.goto('/');
  const background = await page.locator('.site-background').getAttribute('style');
  await page.locator('nav').getByRole('link', { name: '找我&投喂' }).click();
  await expect(page).toHaveURL(/\/contact\/$/);
  await expect(page.locator('.site-background')).toHaveAttribute('style', background!);
  const pictures = page.locator('[data-gallery-image]');
  await expect(pictures).toHaveCount(2);
  await expect(pictures.nth(0)).toHaveAttribute('data-title', '个人联系方式');
  await expect(pictures.nth(1)).toHaveAttribute('data-title', '赞助渠道');
  await pictures.nth(1).click();
  await expect(page.locator('[data-viewer-image]')).toBeVisible();
  await expect(page.locator('[data-viewer-counter]')).toHaveText('2 / 2');
  await page.getByRole('button', { name: '放大', exact: true }).click();
  await expect(page.locator('[data-viewer-zoom]')).toHaveText('125%');
});

test('happy moments show grouped captions, dates and independent image viewers', async ({ page }) => {
  await page.goto('/');
  const background = await page.locator('.site-background').getAttribute('style');
  await page.locator('nav').getByRole('link', { name: '快乐的事' }).click();
  await expect(page).toHaveURL(/\/happy\/$/);
  await expect(page.locator('.site-background')).toHaveAttribute('style', background!);
  await expect(page.locator('[data-happy-post]').first()).toHaveAttribute('data-happy-post', 'browser-multi');
  const multi = page.locator('[data-happy-post="browser-multi"]');
  const single = page.locator('[data-happy-post="browser-single"]');
  await expect(multi.locator('time')).toHaveAttribute('datetime', '2099-03-01');
  await expect(multi.locator('.happy-text')).toHaveText('A happy moment.\n<strong>Plain text</strong>');
  await expect(multi.locator('.happy-text strong')).toHaveCount(0);
  await expect(multi.locator('.happy-text')).toHaveCSS('white-space', 'pre-wrap');
  await expect(multi.locator('[data-gallery-image]')).toHaveCount(2);
  await expect(single.locator('[data-gallery-image]')).toHaveCount(1);
  await expect(page.locator('[data-happy-post="browser-draft"]')).toHaveCount(0);
  await multi.locator('[data-gallery-image]').first().click();
  await expect(multi.locator('[data-viewer-image]')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(multi.locator('[data-viewer-counter]')).toHaveText('2 / 2');
  await page.keyboard.press('Escape');
  await single.locator('[data-gallery-image]').click();
  await expect(single.locator('[data-viewer-image]')).toBeVisible();
  await expect(single.locator('[data-viewer-counter]')).toHaveText('1 / 1');
  await expect(single.getByRole('button', { name: '下一张', exact: true })).toBeDisabled();
});

test('happy resource updates, drafts, removal and an empty feed work without restarting', async ({ page }) => {
  test.setTimeout(60000);
  const { root } = JSON.parse(readFileSync('.cache/browser-fixture.json', 'utf8'));
  const happyRoot = path.resolve(root, 'resource/happy');
  const folder = path.resolve(happyRoot, 'browser-watch');
  expect(folder.startsWith(happyRoot + path.sep)).toBe(true);
  mkdirSync(path.join(folder, 'images'), { recursive: true });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="cyan"/></svg>';
  const config = path.join(folder, 'post.json');
  writeFileSync(path.join(folder, 'images/photo.svg'), svg);
  writeFileSync(config, JSON.stringify({ text: 'First happy caption', date: '2099-04-01' }));
  try {
    await page.goto('/happy/');
    const item = page.locator('[data-happy-post="browser-watch"]');
    await expect(item.locator('.happy-text')).toHaveText('First happy caption', { timeout: 20000 });
    writeFileSync(config, JSON.stringify({ text: 'Updated happy caption', date: '2099-04-01' }));
    await expect(item.locator('.happy-text')).toHaveText('Updated happy caption', { timeout: 20000 });
    writeFileSync(config, '{"draft":true}');
    await expect(item).toHaveCount(0, { timeout: 20000 });
    // This is the disposable fixture, not the author's resource directory.
    expect(happyRoot.startsWith(path.resolve(root, 'resource') + path.sep)).toBe(true);
    rmSync(happyRoot, { recursive: true });
    await expect(page.locator('[data-happy-post]')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('.empty')).toContainText('还没有记录快乐的事');
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('without JavaScript the original image links and complete article list remain usable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4329/drawing/');
  const href = await page.locator('[data-gallery-image]').first().getAttribute('href');
  expect(href).toMatch(/^\/resource\/.*\.(svg|png|jpg|jpeg|webp|gif|avif)$/);
  expect((await page.request.get('http://127.0.0.1:4329' + href)).ok()).toBe(true);
  await page.goto('http://127.0.0.1:4329/stock/');
  await expect(page.locator('[data-filter-controls]')).not.toBeVisible();
  expect(await page.locator('article[data-category]:visible').count()).toBeGreaterThan(0);
  await context.close();
});

test('watcher adds/removes drawings and refreshes hashed Markdown images without restarting', async ({ page, request }) => {
  test.setTimeout(60000);
  const { root } = JSON.parse(readFileSync('.cache/browser-fixture.json', 'utf8'));
  const drawing = path.join(root, 'resource/drawing/watcher-fixture.svg');
  const note = path.join(root, 'resource/stock_text/watcher-note.md');
  const readingNote = path.join(root, 'resource/reading_text/watcher-reading.md');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="purple"/></svg>';
  await page.goto('/drawing/');
  try {
    writeFileSync(drawing, svg);
    await expect(page.locator('[data-gallery-image][data-title="watcher-fixture"]')).toBeVisible({ timeout: 20000 });
    rmSync(drawing);
    await expect(page.locator('[data-gallery-image][data-title="watcher-fixture"]')).toHaveCount(0, { timeout: 20000 });
    const url = '/stock/browser-fixture/';
    const before = await (await request.get(url)).text();
    const imageUrl = before.match(/<img[^>]*src="([^"]+)"[^>]*alt="Fixture"/)?.[1];
    expect(imageUrl).toBeTruthy();
    writeFileSync(path.join(root, 'resource/images/browser-fixture.svg'), svg);
    await expect.poll(async () => (await (await request.get(url)).text()).includes(imageUrl!), { timeout: 20000 }).toBe(false);
    const response = await (await request.get(url)).text();
    const updated = response.match(/<img[^>]*src="([^"]+)"[^>]*alt="Fixture"/)?.[1];
    expect(updated).toBeTruthy();
    expect((await request.get(updated!)).ok()).toBe(true);
    writeFileSync(note, '# Watcher added note');
    await expect.poll(async () => (await request.get('/stock/watcher-note/')).status(), { timeout: 20000 }).toBe(200);
    writeFileSync(note, '# Watcher updated note');
    await expect.poll(async () => (await (await request.get('/stock/watcher-note/')).text()).includes('Watcher updated note'), { timeout: 20000 }).toBe(true);
    rmSync(note);
    await expect.poll(async () => (await request.get('/stock/watcher-note/')).status(), { timeout: 20000 }).toBe(404);
    writeFileSync(readingNote, '# Watcher reading added');
    await expect.poll(async () => (await request.get('/reading/watcher-reading/')).status(), { timeout: 20000 }).toBe(200);
    writeFileSync(readingNote, '# Watcher reading updated');
    await expect.poll(async () => (await (await request.get('/reading/watcher-reading/')).text()).includes('Watcher reading updated'), { timeout: 20000 }).toBe(true);
    rmSync(readingNote);
    await expect.poll(async () => (await request.get('/reading/watcher-reading/')).status(), { timeout: 20000 }).toBe(404);
    const contactBefore = await (await request.get('/contact/')).text();
    const oldContactUrl = contactBefore.match(/href="([^"]+)"[^>]*data-gallery-image/)?.[1];
    expect(oldContactUrl).toBeTruthy();
    const configFile = path.join(root, 'resource/contact/config.json');
    const config = JSON.parse(readFileSync(configFile, 'utf8'));
    writeFileSync(path.join(root, 'resource/contact/updated-contact.svg'), svg);
    config.contact.image = 'updated-contact.svg';
    writeFileSync(configFile, JSON.stringify(config));
    await expect.poll(async () => (await (await request.get('/contact/')).text()).includes(oldContactUrl!), { timeout: 20000 }).toBe(false);
  } finally { rmSync(drawing, { force: true }); rmSync(note, { force: true }); rmSync(readingNote, { force: true }); }
});
