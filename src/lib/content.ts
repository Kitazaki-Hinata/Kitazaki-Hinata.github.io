import { getCollection } from 'astro:content';
import { media } from './media';
type Entry = { id: string; collection: string; data: { title?: string; date?: string; description?: string } };
const info = (entry: Entry) => Object.values(media.entries).find((item) =>
  item.route === (entry.collection === 'about' ? '/' : '/' + entry.collection + '/' + entry.id + '/'));
export const entryTitle = (entry: Entry): string => entry.data.title || info(entry)?.title || entry.id;
export const entryDate = (entry: Entry): string => entry.data.date || info(entry)?.date || '';
export const entrySummary = (entry: Entry): string => entry.data.description ?? info(entry)?.summary ?? '';
async function articleEntries<C extends 'stock' | 'reading'>(collection: C) {
  return (await getCollection(collection, ({ data }) => !data.draft)).sort((a, b) =>
    entryDate(b).localeCompare(entryDate(a)) || a.id.localeCompare(b.id));
}
export const stockEntries = () => articleEntries('stock');
export const readingEntries = () => articleEntries('reading');
