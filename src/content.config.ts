import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  'Use a valid YYYY-MM-DD date.',
).optional();
const common = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  date,
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});
const webUrl = z.url({ protocol: /^https?$/ }).optional();

export const collections = {
  about: defineCollection({
    loader: glob({ pattern: 'about.md', base: './resource' }),
    schema: common,
  }),
  stock: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './resource/stock_text' }),
    schema: common.extend({ category: z.string().default('碎碎念') }),
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './resource/projects' }),
    schema: common.extend({
      repo: webUrl, demo: webUrl,
      cover: z.string().optional(),
      order: z.number().optional(),
    }),
  }),
};
