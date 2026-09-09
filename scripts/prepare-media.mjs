import {
  copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync,
  readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteConfig } from '../src/config/site.ts';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = path.join(projectRoot, 'resource');
const outputRoot = path.join(projectRoot, 'public', 'resource');
const generatedRoot = path.join(projectRoot, 'src', 'generated');
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);
const compare = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const relative = (file) => path.relative(sourceRoot, file).split(path.sep).join('/');

function walk(directory) {
  if (!existsSync(directory)) return [];
  if (lstatSync(directory).isSymbolicLink()) throw new Error('Resource symlinks are not supported: ' + directory);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Resource symlinks are not supported: ' + file);
    if (entry.isDirectory()) return walk(file);
    return extensions.has(path.extname(entry.name).toLowerCase()) ? [file] : [];
  }).sort(compare);
}

function metadata(file) {
  if (!existsSync(file)) return {};
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected an object: ' + file);
  for (const key of ['title', 'description', 'alt', 'date', 'cover', 'author', 'download']) {
    if (data[key] !== undefined && typeof data[key] !== 'string') throw new Error('Invalid ' + key + ': ' + file);
  }
  if (data.order !== undefined && (typeof data.order !== 'number' || !Number.isFinite(data.order))) {
    throw new Error('Invalid order: ' + file);
  }
  if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error('Invalid draft: ' + file);
  if (data.date && (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)
      || !Number.isFinite(Date.parse(data.date))
      || new Date(data.date).toISOString().slice(0, 10) !== data.date)) {
    throw new Error('Invalid date: ' + file);
  }
  if (data.download && !/^https?:\/\//i.test(data.download)) throw new Error('Invalid download URL: ' + file);
  return data;
}

const copies = new Set();
function image(file, details = {}) {
  copies.add(file);
  const filename = path.basename(file, path.extname(file));
  return {
    src: relative(file),
    title: details.title || filename,
    description: details.description || '',
    alt: details.alt || details.title || filename,
    date: details.date || filename.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '',
  };
}

const drawing = walk(path.join(sourceRoot, 'drawing')).map((file) =>
  image(file, metadata(file.slice(0, -path.extname(file).length) + '.json'))
).sort((a, b) => compare(b.date, a.date) || compare(a.src, b.src));

const skins = [];
const skinsRoot = path.join(sourceRoot, 'osu_skin');
if (existsSync(skinsRoot)) {
  for (const folder of readdirSync(skinsRoot, { withFileTypes: true })) {
    if (folder.isSymbolicLink()) throw new Error('Skin symlinks are not supported: ' + folder.name);
    if (!folder.isDirectory()) continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folder.name)) throw new Error('Invalid skin folder name: ' + folder.name);
    const directory = path.join(skinsRoot, folder.name);
    const data = metadata(path.join(directory, 'skin.json'));
    if (data.draft) continue;
    const files = walk(path.join(directory, 'images'));
    if (!files.length) throw new Error('Skin has no images: ' + directory);
    const cover = data.cover ? path.resolve(directory, data.cover) : files[0];
    if (!files.includes(cover)) throw new Error('Cover must reference an image in this skin: ' + directory);
    skins.push({
      id: folder.name,
      title: data.title || folder.name,
      description: data.description || '',
      date: data.date || '',
      author: data.author || '',
      download: data.download || '',
      order: data.order ?? null,
      cover: relative(cover),
      images: files.map((file) => image(file)),
    });
  }
}
skins.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)
  || compare(b.date, a.date) || compare(a.id, b.id));

for (const directory of ['background', 'images']) {
  for (const file of walk(path.join(sourceRoot, directory))) copies.add(file);
}
for (const selected of [siteConfig.background, siteConfig.avatar]) {
  if (!copies.has(path.join(sourceRoot, selected))) throw new Error('Configured image is missing: ' + selected);
}

// These are dedicated build outputs. Never clear resource/ or public/ itself.
mkdirSync(outputRoot, { recursive: true });
if (lstatSync(outputRoot).isSymbolicLink()) throw new Error('Output directory must not be a symlink.');
for (const entry of readdirSync(outputRoot)) {
  if (entry === '.gitkeep') continue;
  const target = path.resolve(outputRoot, entry);
  if (!target.startsWith(path.resolve(outputRoot) + path.sep)) throw new Error('Unsafe output path: ' + target);
  rmSync(target, { recursive: true, force: true });
}
const seen = new Set();
for (const file of copies) {
  const name = relative(file);
  if (seen.has(name.toLowerCase())) throw new Error('Case-insensitive image path collision: ' + name);
  seen.add(name.toLowerCase());
  const target = path.join(outputRoot, name);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(file, target);
}
mkdirSync(generatedRoot, { recursive: true });
writeFileSync(path.join(generatedRoot, 'media.json'), JSON.stringify({ drawing, skins }, null, 2) + '\n');
console.log('Prepared ' + copies.size + ' images, ' + drawing.length + ' drawings and ' + skins.length + ' skins.');
