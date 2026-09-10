import { dev } from 'astro';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareProject, projectRoot } from '../scripts/prepare-media.mjs';
// Browser tests work on a disposable copy, never on the author's resource files.
mkdirSync(path.join(projectRoot, '.cache'), { recursive: true });
const root = mkdtempSync(path.join(projectRoot, '.cache/browser-site-'));
for (const name of ['src', 'scripts', 'resource', 'astro.config.mjs', 'tsconfig.json', 'package.json']) {
  cpSync(path.join(projectRoot, name), path.join(root, name), { recursive: true });
}
mkdirSync(path.join(root, 'public'), { recursive: true });
cpSync(path.join(projectRoot, 'public/favicon.svg'), path.join(root, 'public/favicon.svg'));
const put = (name, content) => {
  const file = path.join(root, 'resource', name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const svg = (color) => '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="' + color + '"/></svg>';
put('drawing/browser-fixture.svg', svg('red'));
put('drawing/browser-fixture.json', '{"title":"Browser fixture drawing"}');
put('osu_skin/browser-fixture/skin.json', '{"title":"Browser fixture skin"}');
put('osu_skin/browser-fixture/images/01.svg', svg('red'));
put('osu_skin/browser-fixture/images/02.svg', svg('blue'));
put('images/browser-fixture.svg', svg('green'));
put('stock_text/browser-fixture.md', '---\ncategory: "Browser fixture"\n---\n# Browser fixture note\n\n![Fixture](../images/browser-fixture.svg)');
put('reading_text/browser-fixture.md', '---\ndate: "2099-02-02"\ncategory: "Browser reading"\n---\n# Browser reading note\n\n![Reading fixture](../images/browser-fixture.svg)\n\n[Stock note](../stock_text/browser-fixture.md)');
put('reading_text/folder/2099-01-01-nested.md', '# Nested reading note');
put('reading_text/browser-draft.md', '---\ndraft: true\n---\n# Unpublished reading');
put('happy/browser-multi/post.json', JSON.stringify({ title: 'Browser happy moment', date: '2099-03-01', text: 'A happy moment.\n<strong>Plain text</strong>' }));
put('happy/browser-multi/images/01.svg', svg('orange'));
put('happy/browser-multi/images/02.svg', svg('pink'));
put('happy/browser-single/post.json', JSON.stringify({ date: '2099-02-01', text: 'Another small joy.' }));
put('happy/browser-single/images/01.svg', svg('yellow'));
put('happy/browser-draft/post.json', '{"draft":true}');
await prepareProject({ root });
writeFileSync(path.join(projectRoot, '.cache/browser-fixture.json'), JSON.stringify({ root }));
const server = await dev({ root: pathToFileURL(root + path.sep), server: { host: '127.0.0.1', port: 4329 }, devToolbar: { enabled: false } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.stop(); process.exit(0); });
