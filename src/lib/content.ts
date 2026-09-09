import { getCollection } from 'astro:content';

type Entry = { id: string; body?: string; data: { title?: string; date?: string; description?: string } };

export function entryTitle(entry: Entry): string {
  return entry.data.title || entry.body?.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.id.split('/').at(-1) || entry.id;
}
export function entryDate(entry: Entry): string {
  return entry.data.date || entry.id.split('/').at(-1)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
}
export function entrySummary(entry: Entry): string {
  return entry.data.description || (entry.body || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}
export async function stockEntries() {
  return (await getCollection('stock', ({ data }) => !data.draft)).sort((a, b) =>
    entryDate(b).localeCompare(entryDate(a)) || a.id.localeCompare(b.id));
}
export async function projectEntries() {
  return (await getCollection('projects', ({ data }) => !data.draft)).sort((a, b) =>
    (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || a.id.localeCompare(b.id));
}
