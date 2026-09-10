import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { prepareProject, projectRoot } from '../scripts/prepare-media.mjs';
import { contentId, parseMarkdown, resolveResource } from '../scripts/content-rules.mjs';
import { fitScale, constrainPan, zoomAt } from '../src/scripts/viewer-math.ts';

async function fixture(t) {
  const cache = path.join(projectRoot, '.cache');
  mkdirSync(cache, { recursive: true });
  const root = mkdtempSync(path.join(cache, 'resource-test-'));
  t.after(() => {
    assert.ok(root.startsWith(cache + path.sep));
    rmSync(root, { recursive: true, force: true });
  });
  const put = (name, content) => {
    const file = path.join(root, 'resource', name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    return file;
  };
  const png = await sharp({ create: { width: 1600, height: 1000, channels: 4, background: '#123456' } }).png().toBuffer();
  put('background/main.png', png); put('images/avatar.png', png); put('about.md', '# About');
  put('contact/contact.png', png); put('contact/support.png', png);
  put('contact/config.json', JSON.stringify({ contact: { image: 'contact.png' }, support: { image: 'support.png' } }));
  const run = () => prepareProject({ root, site: { background: 'background/main.png', avatar: 'images/avatar.png' } });
  return { root, put, run, png, manifest: () => readFileSync(path.join(root, 'src/generated/media.json'), 'utf8') };
}
test('responsive thumbnails preserve aspect, originals and small-image dimensions', async (t) => {
  const f = await fixture(t);
  f.put('drawing/art.png', f.png);
  f.put('drawing/small.png', await sharp(f.png).resize(60, 38).toBuffer());
  const result = await f.run();
  assert.deepEqual(result.assets['drawing/art.png'].thumbnails.map(({ width, height }) => [width, height]), [[400, 250], [800, 500], [1200, 750]]);
  assert.deepEqual(result.assets['drawing/small.png'].thumbnails.map(({ width, height }) => [width, height]), [[60, 38]]);
  assert.deepEqual(readFileSync(path.join(f.root, 'public/resource', result.assets['drawing/art.png'].src)), f.png);
  assert.equal((await f.run()).revision, result.revision);
});
test('EXIF rotation and animated GIF thumbnails preserve the original and correct frame size', async (t) => {
  const f = await fixture(t);
  const jpeg = await sharp(f.png).resize(80, 40).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  f.put('drawing/rotated.jpg', jpeg);
  const red = Buffer.alloc(40 * 30 * 3), blue = Buffer.alloc(red.length);
  for (let i = 0; i < red.length; i += 3) { red[i] = 255; blue[i + 2] = 255; }
  const gif = await sharp(Buffer.concat([red, blue]), { raw: { width: 40, height: 60, channels: 3, pageHeight: 30 } }).gif({ delay: [100, 100] }).toBuffer();
  f.put('drawing/animated.gif', gif);
  const result = await f.run();
  const rotated = result.assets['drawing/rotated.jpg'], animated = result.assets['drawing/animated.gif'];
  assert.deepEqual([rotated.width, rotated.height, rotated.thumbnails[0].width, rotated.thumbnails[0].height], [40, 80, 40, 80]);
  assert.deepEqual([animated.width, animated.height, animated.thumbnails[0].width, animated.thumbnails[0].height], [40, 30, 40, 30]);
  const original = readFileSync(path.join(f.root, 'public/resource', animated.src));
  assert.deepEqual(original, gif); assert.equal((await sharp(original).metadata()).pages, 2);
});
test('replacement changes hashes, deletion removes outputs, drafts suppress skin assets', async (t) => {
  const f = await fixture(t);
  f.put('drawing/art.png', f.png);
  const before = await f.run();
  f.put('drawing/art.png', await sharp(f.png).tint('#ff0000').png().toBuffer());
  const after = await f.run();
  assert.notEqual(before.assets['drawing/art.png'].src, after.assets['drawing/art.png'].src);
  const old = after.assets['drawing/art.png'];
  rmSync(path.join(f.root, 'resource/drawing/art.png'));
  f.put('osu_skin/draft/images/a.png', await sharp(f.png).resize(100).toBuffer());
  f.put('osu_skin/draft/skin.json', '{"draft":true}');
  const result = await f.run();
  assert.equal(result.drawing.length, 0); assert.equal(result.skins.length, 0);
  for (const file of [old.src, ...old.thumbnails.map((thumb) => thumb.src)]) assert.equal(existsSync(path.join(f.root, 'public/resource', file)), false);
});
test('invalid metadata and broken images leave the last generated version usable', async (t) => {
  const f = await fixture(t);
  await f.run(); const before = f.manifest();
  f.put('drawing/invalid.png', 'not an image');
  await assert.rejects(f.run(), /unsupported image|Input buffer/i);
  assert.equal(f.manifest(), before);
  rmSync(path.join(f.root, 'resource/drawing/invalid.png'));
  f.put('stock_text/date.md', '---\ndate: "2026-02-30"\n---\nText');
  await assert.rejects(f.run(), /date/); assert.equal(f.manifest(), before);
  assert.ok(readdirSync(path.join(f.root, 'public/resource')).length > 0);
});
test('route normalization collisions and ambiguous drawing metadata fail clearly', async (t) => {
  const f = await fixture(t);
  f.put('stock_text/a b.md', '# A'); f.put('stock_text/a-b.md', '# B');
  await assert.rejects(f.run(), /Route collision/);
  rmSync(path.join(f.root, 'resource/stock_text/a b.md'));
  f.put('drawing/art.png', f.png); f.put('drawing/art.webp', f.png);
  await assert.rejects(f.run(), /Ambiguous drawing/);
  assert.equal(contentId('2026/中文 笔记.md'), '2026/中文-笔记');
  assert.throws(() => contentId('index.md'), /reserved/);
});
test('published Markdown references are checked, fenced examples are ignored', async (t) => {
  const f = await fixture(t);
  f.put('stock_text/first.md', '# Hello **world**\n\nVisible text.\n\n```md\n![example](missing.png)\n```');
  let result = await f.run();
  assert.equal(result.entries['stock_text/first.md'].title, 'Hello world');
  assert.equal(result.entries['stock_text/first.md'].summary, 'Visible text.');
  f.put('stock_text/first.md', '![missing](../images/MISSING.png)');
  await assert.rejects(f.run(), /missing published image/);
  f.put('stock_text/first.md', '[draft](draft.md)');
  f.put('stock_text/draft.md', '---\ndraft: true\n---\n# Draft');
  await assert.rejects(f.run(), /draft Markdown target/);
  f.put('stock_text/first.md', '![avatar][a]\n\n[a]: ../images/avatar.png');
  f.put('reading_text/note.md', '[Stock note](../stock_text/first.md)');
  assert.equal((await f.run()).entries['reading_text/note.md'].route, '/reading/note/');
});
test('reading entries support nested routes, metadata fallbacks, drafts and route collision checks', async (t) => {
  const f = await fixture(t);
  f.put('reading_text/2026/a note.md', '# A reading note\n\nA thought.');
  f.put('reading_text/draft.md', '---\ndraft: true\n---\n# Draft');
  f.put('stock_text/2026/a note.md', '# A stock note');
  const result = await f.run();
  assert.equal(result.entries['reading_text/2026/a note.md'].route, '/reading/2026/a-note/');
  assert.equal(result.entries['reading_text/2026/a note.md'].title, 'A reading note');
  assert.equal(result.entries['reading_text/2026/a note.md'].summary, 'A thought.');
  assert.equal(result.entries['reading_text/draft.md'].draft, true);
  f.put('reading_text/2026/a-note.md', '# Duplicate');
  await assert.rejects(f.run(), /Route collision/);
});
test('contact publishes exactly the selected images and rejects missing or outside references', async (t) => {
  const f = await fixture(t);
  f.put('contact/unused.png', await sharp(f.png).resize(200).toBuffer());
  const result = await f.run();
  assert.deepEqual(result.contact.map((item) => item.title), ['个人联系方式', '赞助渠道']);
  assert.ok(result.contact.every((item) => item.width && item.thumbnail));
  assert.equal(result.assets['contact/unused.png'], undefined);
  const previous = f.manifest();
  f.put('contact/config.json', JSON.stringify({ contact: { image: '../images/avatar.png' }, support: { image: 'support.png' } }));
  await assert.rejects(f.run(), /inside resource\/contact/);
  assert.equal(f.manifest(), previous);
  f.put('contact/config.json', JSON.stringify({ contact: { image: 'missing.png' }, support: { image: 'support.png' } }));
  await assert.rejects(f.run(), /missing image/);
});
test('resource URLs respect nesting, encoding and boundaries', () => {
  const root = path.join(projectRoot, 'resource');
  const file = path.join(root, 'stock_text/2026/note.md');
  assert.equal(resolveResource('../../images/%E4%B8%AD%E6%96%87.png', file, root, true).relative, 'images/中文.png');
  assert.throws(() => resolveResource('../../../outside.png', file, root, true), /outside/);
  assert.throws(() => resolveResource('javascript:alert(1)', file, root, true), /unsupported/);
  assert.equal(resolveResource('https://example.com/image.png', file, root, true), null);
  assert.throws(() => parseMarkdown('---\ndraft: "false"\n---', file), /draft/);
});
test('viewer fitting, anchored zoom and panning stay within image bounds', () => {
  assert.equal(fitScale(1600, 1000, 800, 800), .5);
  assert.equal(fitScale(60, 40, 800, 800), 1);
  assert.deepEqual(constrainPan(10000, -10000, 1600, 1000, 800, 800), { x: 400, y: -100 });
  assert.deepEqual(constrainPan(20, 30, 400, 250, 800, 800), { x: 0, y: 0 });
  assert.deepEqual(zoomAt(0, 0, 2, 100, 50), { x: -100, y: -50 });
});
