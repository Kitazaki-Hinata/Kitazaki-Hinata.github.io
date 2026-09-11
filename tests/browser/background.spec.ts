import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';

function resourceUrls() {
  const { root } = JSON.parse(readFileSync('.cache/browser-fixture.json', 'utf8'));
  const { assets } = JSON.parse(readFileSync(path.join(root, 'src/generated/media.json'), 'utf8'));
  return {
    main: '/resource/' + assets['background/main-bg.webp'].src,
    side: '/resource/' + assets['background/side-bg.webp'].src,
    avatar: '/resource/' + assets['images/avatar.webp'].src,
  };
}

test('home displays its background immediately while content waits for decoding and side preloading waits for page load', async ({ page }) => {
  const urls = resourceUrls();
  let releaseMain!: () => void, releaseAvatar!: () => void;
  const mainGate = new Promise<void>((resolve) => { releaseMain = resolve; });
  const avatarGate = new Promise<void>((resolve) => { releaseAvatar = resolve; });
  await page.route('**' + urls.main, async (route) => { await mainGate; await route.continue(); });
  await page.route('**' + urls.avatar, async (route) => { await avatarGate; await route.continue(); });
  let sideRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith(urls.side)) sideRequests++;
  });
  await page.addInitScript((main) => {
    const decode = HTMLImageElement.prototype.decode;
    const gate = new Promise<void>((resolve) => { Reflect.set(window, 'releaseBackgroundDecode', resolve); });
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      if (!this.src.endsWith(main)) return;
      Reflect.set(window, 'backgroundBytesDecoded', true);
      await gate;
    };
    window.addEventListener('load', () => Reflect.set(window, 'homeLoadFired', true));
  }, urls.main);

  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute('href', urls.main);
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute('fetchpriority', 'high');
    await expect(page.locator('main')).toBeHidden();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeHidden();
    await expect(page.locator('.site-background')).toBeVisible();
    expect(await page.locator('main').evaluate((main) => main.getAnimations({ subtree: true }).length)).toBe(0);
    expect(sideRequests).toBe(0);

    releaseMain();
    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'backgroundBytesDecoded'))).toBe(true);
    // A decoded background can paint even while the content's decode promise is pending.
    await expect(page.locator('.site-background')).toBeVisible();
    await expect(page.locator('main')).toBeHidden();
    expect(sideRequests).toBe(0);
    await page.evaluate(() => Reflect.get(window, 'releaseBackgroundDecode')());
    await expect(page.locator('.site-background')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.home-hero h1')).toHaveCSS('animation-name', 'page-enter');
    expect(await page.evaluate(() => Reflect.get(window, 'homeLoadFired'))).not.toBe(true);
    expect(sideRequests).toBe(0);

    const sideLoaded = page.waitForResponse((response) => response.url().endsWith(urls.side));
    releaseAvatar();
    expect((await sideLoaded).ok()).toBe(true);
    expect(await page.evaluate(() => Reflect.get(window, 'homeLoadFired'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
    expect(sideRequests).toBe(1);
  } finally {
    releaseMain();
    releaseAvatar();
  }
});

test('a failed home background releases content instead of leaving a blank page', async ({ page }) => {
  const { main } = resourceUrls();
  await page.route('**' + main, (route) => route.abort());
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();
  expect(errors).toEqual([]);
});

test('reduced motion still waits for the home background without playing an entrance animation', async ({ page }) => {
  const { main } = resourceUrls();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**' + main, async (route) => { await gate; await route.continue(); });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeHidden();
    release();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.home-hero h1')).toHaveCSS('animation-name', 'none');
  } finally { release(); }
});

test('home remains readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4329/');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.site-background')).toBeVisible();
  } finally { await context.close(); }
});

test('inner pages warm the home background after loading without waiting for it to display content', async ({ page }) => {
  const { main, side } = resourceUrls();
  let releaseSide!: () => void, releaseMain!: () => void;
  const sideGate = new Promise<void>((resolve) => { releaseSide = resolve; });
  const mainGate = new Promise<void>((resolve) => { releaseMain = resolve; });
  await page.route('**' + side, async (route) => { await sideGate; await route.continue(); });
  await page.route('**' + main, async (route) => { await mainGate; await route.continue(); });
  await page.addInitScript(() => {
    window.addEventListener('load', () => Reflect.set(window, 'innerLoadFired', true));
  });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  try {
    await page.goto('/drawing/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.get(window, 'innerLoadFired'))).not.toBe(true);
    expect(requests.some((url) => url.endsWith(main))).toBe(false);

    const mainRequested = page.waitForRequest((request) => request.url().endsWith(main));
    releaseSide();
    await mainRequested;
    expect(await page.evaluate(() => Reflect.get(window, 'innerLoadFired'))).toBe(true);
    expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav a[href="/"]')).toBeVisible();
    await expect(page.locator('.site-background')).toHaveCSS('background-image', `url("${new URL(side, page.url()).href}")`);
    const mainLoaded = page.waitForResponse((response) => response.url().endsWith(main));
    releaseMain();
    expect((await mainLoaded).ok()).toBe(true);
  } finally {
    releaseSide();
    releaseMain();
  }
});

for (const startRoute of ['/', '/drawing/']) {
  test(`cacheable backgrounds download once across repeated navigation starting at ${startRoute}`, async ({ browser, request }) => {
    const { main, side } = resourceUrls();
    const downloads = new Map<string, number>();
    // Playwright routing disables HTTP caching. Use a real local server with cache headers instead.
    const server = createServer(async (req, res) => {
      const url = req.url || '/';
      downloads.set(url, (downloads.get(url) || 0) + 1);
      try {
        const response = await request.get(url);
        const bytes = await response.body();
        res.writeHead(response.status(), {
          'Content-Type': response.headers()['content-type'] || 'application/octet-stream',
          'Cache-Control': url.startsWith('/resource/') ? 'public, max-age=3600' : 'no-store',
        });
        res.end(bytes);
      } catch { res.writeHead(502); res.end(); }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing server port');
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.addInitScript((main) => {
        const decode = HTMLImageElement.prototype.decode;
        const gate = new Promise<void>((resolve) => { Reflect.set(window, 'releaseBackgroundDecode', resolve); });
        HTMLImageElement.prototype.decode = async function () {
          await decode.call(this);
          if (!this.src.endsWith(main)) return;
          Reflect.set(window, 'backgroundBytesDecoded', true);
          await gate;
        };
      }, main);
      const releaseHomeContent = async () => {
        if (new URL(page.url()).pathname !== '/') return;
        await expect.poll(() => page.evaluate(() => Reflect.get(window, 'backgroundBytesDecoded'))).toBe(true);
        // Even on repeat visits, a pending content gate must not hide the cached background.
        await expect(page.locator('.site-background')).toBeVisible();
        await expect(page.locator('main')).toBeHidden();
        await page.evaluate(() => Reflect.get(window, 'releaseBackgroundDecode')());
      };
      const origin = 'http://127.0.0.1:' + address.port;
      const waitForBackgrounds = () => page.waitForFunction((urls) => urls.every((url) =>
        performance.getEntriesByName(url).some((entry) => (entry as PerformanceResourceTiming).responseEnd > 0)),
      [origin + main, origin + side]);
      await page.goto(origin + startRoute);
      await releaseHomeContent();
      await waitForBackgrounds();
      expect(downloads.get(main)).toBe(1);
      expect(downloads.get(side)).toBe(1);
      for (const route of ['/', '/drawing/', '/', '/reading/', '/']) {
        await page.locator(`nav a[href="${route}"]`).click();
        await expect(page).toHaveURL(origin + route);
        await expect(page.locator('.site-background')).toHaveCSS('background-image', `url("${origin + (route === '/' ? main : side)}")`);
        await releaseHomeContent();
        await expect(page.locator('main')).toBeVisible();
        await page.waitForLoadState('load');
        await waitForBackgrounds();
        expect(downloads.get(main)).toBe(1);
        expect(downloads.get(side)).toBe(1);
      }
    } finally {
      await context.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
}
