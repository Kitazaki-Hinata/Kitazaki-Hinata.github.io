import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { compare, slash, fileDate, contentId, validateMetadata, parseMarkdown, resolveResource, visitResourceLinks } from './content-rules.mjs';

const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);
const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 20);
export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function walk(directory) {
  if (!existsSync(directory)) return [];
  if (lstatSync(directory).isSymbolicLink()) throw new Error('Resource/output symlinks are not supported: ' + directory);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Resource/output symlinks are not supported: ' + file);
    return entry.isDirectory() ? walk(file) : [file];
  }).sort(compare);
}
function safeDirectory(root, relative) {
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('Output symlink: ' + current);
  }
  mkdirSync(current, { recursive: true });
  return current;
}
function removeInside(directory, target) {
  if (!path.resolve(target).startsWith(path.resolve(directory) + path.sep)) throw new Error('Unsafe cleanup: ' + target);
  rmSync(target, { recursive: true, force: true });
}
export async function prepareProject({ root = projectRoot, site } = {}) {
  if (!site) site = (await import('../src/config/site.ts?update=' + Date.now())).siteConfig;
  const sourceRoot = path.join(root, 'resource');
  const all = walk(sourceRoot);
  const relative = (file) => slash(path.relative(sourceRoot, file));
  const byName = new Map(all.map((file) => [relative(file), file]));
  const names = new Map();
  for (const file of all) {
    const key = relative(file).normalize('NFKC').toLowerCase();
    if (names.has(key)) throw new Error('Resource path collision: ' + names.get(key) + ' / ' + relative(file));
    names.set(key, relative(file));
  }
  const images = all.filter((file) => extensions.has(path.extname(file).toLowerCase()));
  const json = (file) => {
    if (!existsSync(file)) return {};
    try { return validateMetadata(JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')), file); }
    catch (error) { throw new Error(file + ': ' + error.message); }
  };
  const selected = new Set();
  const image = (file, data = {}) => {
    selected.add(file);
    const title = data.title || path.basename(file, path.extname(file));
    return { source: relative(file), title, description: data.description || '', alt: data.alt || title, date: data.date || fileDate(file) };
  };
  const drawingFiles = images.filter((file) => relative(file).startsWith('drawing/'));
  const stems = new Map();
  const drawing = drawingFiles.map((file) => {
    const stem = file.slice(0, -path.extname(file).length);
    const key = stem.normalize('NFKC').toLowerCase();
    if (stems.has(key)) throw new Error('Ambiguous drawing metadata: ' + stem);
    stems.set(key, file);
    const data = json(stem + '.json');
    return data.draft ? null : image(file, data);
  }).filter(Boolean).sort((a, b) => compare(b.date, a.date) || compare(a.source, b.source));
  for (const file of all.filter((file) => relative(file).startsWith('drawing/') && file.endsWith('.json'))) {
    const match = stems.get(file.slice(0, -5).normalize('NFKC').toLowerCase());
    if (!match || match.slice(0, -path.extname(match).length) + '.json' !== file) throw new Error('Drawing metadata has no matching image (check case): ' + file);
  }
  const skins = [];
  const skinsRoot = path.join(sourceRoot, 'osu_skin');
  for (const folder of existsSync(skinsRoot) ? readdirSync(skinsRoot, { withFileTypes: true }) : []) {
    if (!folder.isDirectory()) {
      if (extensions.has(path.extname(folder.name).toLowerCase())) throw new Error('Place skin images in <id>/images/: ' + folder.name);
      continue;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folder.name)) throw new Error('Invalid skin folder name: ' + folder.name);
    const directory = path.join(skinsRoot, folder.name);
    const data = json(path.join(directory, 'skin.json'));
    if (data.draft) continue;
    const files = images.filter((file) => file.startsWith(directory + path.sep + 'images' + path.sep));
    if (!files.length) throw new Error('Skin has no images: ' + directory);
    const cover = data.cover ? path.resolve(directory, data.cover) : files[0];
    if (!files.includes(cover)) throw new Error('Cover must reference an image in this skin (check case): ' + directory);
    skins.push({ id: folder.name, title: data.title || folder.name, description: data.description || '',
      date: data.date || '', author: data.author || '', download: data.download || '', order: data.order ?? null,
      cover: relative(cover), images: files.map((file) => image(file)) });
  }
  skins.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || compare(b.date, a.date) || compare(a.id, b.id));
  for (const file of images) if (/^(background|images)\//.test(relative(file))) selected.add(file);
  for (const value of [site.background, site.avatar]) {
    if (!selected.has(byName.get(value))) throw new Error('Configured image is missing (check case): ' + value);
  }
  const contactRoot = path.join(sourceRoot, 'contact');
  const contactConfigFile = path.join(contactRoot, 'config.json');
  const contactConfig = json(contactConfigFile);
  const contact = [['contact', '个人联系方式'], ['support', '赞助渠道']].map(([key, title]) => {
    const label = contactConfigFile + ': ' + key;
    const details = validateMetadata(contactConfig[key], label);
    if (typeof details.image !== 'string' || !details.image.trim() || details.image.includes('\\')) {
      throw new Error(label + '.image must be a filename relative to resource/contact/');
    }
    const file = path.resolve(contactRoot, details.image);
    if (!file.startsWith(contactRoot + path.sep) || !images.includes(file)) {
      throw new Error(label + ': missing image inside resource/contact/ (check case): ' + details.image);
    }
    return image(file, { title, description: details.description, alt: details.alt || title });
  });
  if (!byName.has('about.md')) throw new Error('Missing resource/about.md');

  const entries = {};
  const parsedEntries = [];
  const routes = new Map();
  for (const file of all.filter((file) => /^(about\.md$|(?:stock_text|reading_text)\/.*\.md$)/.test(relative(file)))) {
    const name = relative(file);
    const parsed = parseMarkdown(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''), file);
    const id = name === 'about.md' ? 'about' : contentId(name.slice(name.indexOf('/') + 1));
    const route = name === 'about.md' ? '/' : '/' + (name.startsWith('stock_text/') ? 'stock' : 'reading') + '/' + id + '/';
    if (routes.has(route)) throw new Error('Route collision: ' + routes.get(route) + ' / ' + name + ' -> ' + route);
    routes.set(route, name);
    entries[name] = { id, route, draft: parsed.data.draft || false,
      title: parsed.data.title || (parsed.title && parsed.text(parsed.title)) || path.basename(id),
      summary: parsed.data.description ?? parsed.summary, date: parsed.data.date || fileDate(file) };
    parsedEntries.push({ file, parsed });
  }
  for (const { file, parsed } of parsedEntries) {
    if (parsed.data.draft) continue;
    visitResourceLinks(parsed.tree, (node, isImage) => {
      const resolved = resolveResource(node.url, file, sourceRoot, isImage);
      if (!resolved) return;
      if (resolved.relative.endsWith('.md')) {
        if (isImage || !entries[resolved.relative] || entries[resolved.relative].draft) throw new Error(file + ': missing or draft Markdown target: ' + node.url);
      } else if (!selected.has(byName.get(resolved.relative))) throw new Error(file + ': missing published image (check case): ' + node.url);
    });
  }

  // Validate everything before touching published files. Stage all image decoding/compression first.
  const cache = safeDirectory(root, '.cache');
  const output = safeDirectory(root, 'public/resource');
  const generated = safeDirectory(root, 'src/generated');
  const previousFiles = walk(output);
  const stage = mkdtempSync(path.join(cache, 'media-stage-'));
  const assets = {};
  try {
    for (const file of [...selected].sort(compare)) {
      const bytes = readFileSync(file);
      const digest = hash(bytes);
      const original = digest + path.extname(file).toLowerCase();
      const metadata = await sharp(bytes).metadata().catch((error) => { throw new Error(file + ': ' + error.message); });
      const oriented = metadata.autoOrient;
      const width = oriented?.width || metadata.width;
      // metadata() reads the first frame by default, so animated images may omit pageHeight.
      const height = metadata.pageHeight || oriented?.height || metadata.height;
      if (!width || !height) throw new Error('Image has no dimensions: ' + file);
      copyFileSync(file, path.join(stage, original));
      const thumbnails = [];
      for (const size of [...new Set([400, 800, 1200].map((value) => Math.min(value, width)))]) {
        const src = digest + '-' + size + '-q80-v1.webp';
        const existing = path.join(output, src);
        if (existsSync(existing)) copyFileSync(existing, path.join(stage, src));
        else await sharp(bytes).rotate().resize({ width: size, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(stage, src));
        // Reading from a buffer avoids libvips retaining file handles on Windows.
        const thumb = await sharp(readFileSync(path.join(stage, src))).metadata();
        thumbnails.push({ src, width: thumb.width, height: thumb.height });
      }
      assets[relative(file)] = { src: original, width, height, thumbnail: thumbnails.find((thumb) => thumb.width >= 800)?.src || thumbnails.at(-1).src, thumbnails };
    }
    for (const item of [...drawing, ...contact, ...skins.flatMap((skin) => skin.images)]) Object.assign(item, assets[item.source]);
    const payload = { assets, drawing, skins, contact, entries };
    const manifest = JSON.stringify({ revision: hash(JSON.stringify(payload)), ...payload }, null, 2) + '\n';
    const manifestPath = path.join(generated, 'media.json');
    if (existsSync(manifestPath) && lstatSync(manifestPath).isSymbolicLink()) throw new Error('Manifest must not be a symlink');
    const nextFiles = new Set(readdirSync(stage));
    for (const file of nextFiles) copyFileSync(path.join(stage, file), path.join(output, file));
    if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== manifest) {
      writeFileSync(path.join(stage, 'media.json'), manifest);
      renameSync(path.join(stage, 'media.json'), manifestPath);
    }
    for (const file of previousFiles) if (path.basename(file) !== '.gitkeep' && !nextFiles.has(slash(path.relative(output, file)))) removeInside(output, file);
    return { ...payload, revision: hash(JSON.stringify(payload)) };
  } finally { removeInside(cache, stage); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await prepareProject();
  console.log(`Prepared ${Object.keys(result.assets).length} images with thumbnails, ${result.drawing.length} drawings and ${result.skins.length} skins.`);
}
