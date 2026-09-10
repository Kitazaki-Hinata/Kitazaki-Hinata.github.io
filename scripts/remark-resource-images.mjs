import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveResource, visitResourceLinks } from './content-rules.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export default function resourceImages({ base = '/' } = {}) {
  return (tree, file) => {
    const manifest = JSON.parse(readFileSync(path.join(root, 'src/generated/media.json'), 'utf8'));
    visitResourceLinks(tree, (node, isImage) => {
      const resolved = resolveResource(node.url, path.resolve(String(file.path)), path.join(root, 'resource'), isImage);
      if (!resolved) return;
      const asset = manifest.assets[resolved.relative];
      const entry = manifest.entries[resolved.relative];
      if (!asset && (!entry || entry.draft || isImage)) throw new Error(file.path + ': missing published resource: ' + node.url);
      const target = asset ? '/resource/' + asset.src : entry.route;
      node.url = base.replace(/\/$/, '') + target.split('/').map(encodeURIComponent).join('/') + resolved.suffix;
    });
  };
}
