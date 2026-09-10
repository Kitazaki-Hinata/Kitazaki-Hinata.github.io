import { defineCollection } from 'astro:content';
import { resourceLoader } from '../scripts/resource-loader.mjs';
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

export const collections = {
  about: defineCollection({
    loader: resourceLoader('about', { pattern: 'about.md', base: './resource' }),
    schema: common,
  }),
  stock: defineCollection({
    loader: resourceLoader('stock', { pattern: '**/*.md', base: './resource/stock_text' }),
    schema: common.extend({ category: z.string().trim().min(1).default('碎碎念') }),
  }),
  reading: defineCollection({
    loader: resourceLoader('reading', { pattern: '**/*.md', base: './resource/reading_text' }),
    schema: common.extend({ category: z.string().trim().min(1).default('读书笔记') }),
  }),
};
