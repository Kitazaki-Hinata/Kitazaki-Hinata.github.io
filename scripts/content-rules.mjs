import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

export const slash = (value) => value.split(path.sep).join('/');
export const compare = (a, b) => a.localeCompare(b, 'en', { numeric: true });
export const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function fileDate(file) {
  const value = path.basename(file).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return validDate(value) ? value : '';
}
export function contentId(entry) {
  const segments = slash(entry).replace(/\.md$/, '').split('/').map((part) =>
    part.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]/gu, ''));
  if (segments.some((part) => !part || part === 'index')) throw new Error('Invalid or reserved route name: ' + entry);
  return segments.join('/');
}
export function validateMetadata(data, file) {
  const fail = (field) => { throw new Error(file + ': invalid ' + field); };
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('metadata (expected object)');
  for (const key of ['title', 'description', 'alt', 'date', 'cover', 'author', 'download', 'category']) {
    if (data[key] !== undefined && typeof data[key] !== 'string') fail(key);
  }
  for (const key of ['title', 'category', 'cover']) {
    if (data[key] !== undefined && !data[key].trim()) fail(key + ' (must not be blank)');
  }
  if (data.date !== undefined && !validDate(data.date)) fail('date (use YYYY-MM-DD)');
  if (data.order !== undefined && (typeof data.order !== 'number' || !Number.isFinite(data.order))) fail('order');
  if (data.draft !== undefined && typeof data.draft !== 'boolean') fail('draft');
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string'))) fail('tags');
  if (data.slug !== undefined) fail('slug (routes come from filenames)');
  for (const key of ['download']) {
    if (data[key] === undefined) continue;
    try { if (!['http:', 'https:'].includes(new URL(data[key]).protocol)) fail(key); }
    catch { fail(key + ' URL'); }
  }
  return data;
}
export function parseMarkdown(source, file) {
  let parsed;
  try { parsed = matter(source); } catch (error) { throw new Error(file + ': ' + error.message); }
  validateMetadata(parsed.data, file);
  const tree = unified().use(remarkParse).parse(parsed.content);
  const text = (node) => node.type === 'image' || node.type === 'imageReference' ? ''
    : typeof node.value === 'string' ? node.value : (node.children || []).map(text).join('');
  return { data: parsed.data, tree, title: tree.children.find((node) => node.type === 'heading' && node.depth === 1),
    text, summary: tree.children.filter((node) => !['heading', 'definition', 'html', 'code'].includes(node.type)).map(text).join(' ').replace(/\s+/g, ' ').trim().slice(0, 120) };
}

// Resolve only local Markdown/image URLs; external links and page anchors remain intact.
export function resolveResource(url, file, root, image = false) {
  if (/^(?:https?:|data:|\/\/|#)/i.test(url)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
    if (!image && /^(mailto:|tel:)/i.test(url)) return null;
    throw new Error(file + ': unsupported URL: ' + url);
  }
  const pathname = url.split(/[?#]/)[0];
  if (!image && !/\.md$/i.test(pathname) && !/^\/?resource\//.test(pathname)) return null;
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { throw new Error(file + ': invalid URL encoding: ' + url); }
  if (decoded.includes('\\')) throw new Error(file + ': use / in resource URLs: ' + url);
  const target = /^\/?resource\//.test(decoded)
    ? path.resolve(root, decoded.replace(/^\/?resource\//, '')) : path.resolve(path.dirname(file), decoded);
  const relative = slash(path.relative(root, target));
  if (relative.startsWith('../') || path.isAbsolute(relative) || (image && !relative.startsWith('images/'))) {
    throw new Error(file + ': resource path is outside ' + (image ? 'resource/images/' : 'resource/') + ': ' + url);
  }
  return { relative, suffix: url.slice(pathname.length) };
}
export function visitResourceLinks(tree, visit) {
  const definitions = new Map();
  function walk(node, callback) { callback(node); node.children?.forEach((child) => walk(child, callback)); }
  walk(tree, (node) => { if (node.type === 'definition') definitions.set(node.identifier, node); });
  const visited = new Set();
  walk(tree, (node) => {
    if (node.type === 'image' || node.type === 'link') visit(node, node.type === 'image');
    if (node.type === 'imageReference' || node.type === 'linkReference') {
      const definition = definitions.get(node.identifier);
      if (definition && !visited.has(definition)) { visit(definition, node.type === 'imageReference'); visited.add(definition); }
    }
  });
}
