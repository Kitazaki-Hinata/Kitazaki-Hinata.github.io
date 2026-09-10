import { readFileSync } from 'node:fs';
import { glob } from 'astro/loaders';
import { contentId } from './content-rules.mjs';

// Media changes must invalidate cached Markdown, including unchanged source documents.
export function resourceLoader(name, options) {
  const loader = glob({ ...options, generateId: ({ entry }) => contentId(entry) });
  return {
    name: 'resource-' + name,
    load(context) {
      // The integration refreshes only after validation. Avoid registering another glob
      // watcher on every refresh, or rendering Markdown against a half-written manifest.
      return loader.load({ ...context, watcher: undefined, generateDigest(value) {
        const { revision } = JSON.parse(readFileSync(new URL('../src/generated/media.json', import.meta.url), 'utf8'));
        return context.generateDigest({ value, revision });
      } });
    },
  };
}
