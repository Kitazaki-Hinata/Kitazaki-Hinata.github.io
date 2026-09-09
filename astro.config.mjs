import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import resourceImages from './scripts/remark-resource-images.mjs';

const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site: 'https://kitazaki-hinata.github.io',
  base,
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: unified({ remarkPlugins: [[resourceImages, { base }]] }),
  },
});
