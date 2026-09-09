import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../resource/', import.meta.url));

export default function resourceImages({ base = '/' } = {}) {
  return (tree, file) => {
    function rewrite(url) {
      if (/^(?:https?:|data:|\/\/|#)/i.test(url)) return url;
      const pathname = url.split(/[?#]/)[0];
      const suffix = url.slice(pathname.length);
      const source = /^\/?resource\//.test(pathname)
        ? path.resolve(root, decodeURIComponent(pathname.replace(/^\/?resource\//, '')))
        : path.resolve(path.dirname(file.path), decodeURIComponent(pathname));
      const relative = path.relative(root, source).split(path.sep).join('/');
      if (!relative.startsWith('images/') || !existsSync(source)) {
        throw new Error('Markdown images must reference an existing resource/images file: ' + file.path + ' -> ' + url);
      }
      return base.replace(/\/$/, '') + '/resource/' + relative.split('/').map(encodeURIComponent).join('/') + suffix;
    }
    const references = new Set();
    function collect(node) {
      if (node.type === 'imageReference') references.add(node.identifier);
      node.children?.forEach(collect);
    }
    function visit(node) {
      if (node.type === 'image' || (node.type === 'definition' && references.has(node.identifier))) node.url = rewrite(node.url);
      node.children?.forEach(visit);
    }
    collect(tree);
    visit(tree);
  };
}
