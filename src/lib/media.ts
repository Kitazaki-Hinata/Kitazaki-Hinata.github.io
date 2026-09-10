import generated from '../generated/media.json';
export interface Thumbnail { src: string; width: number; height: number }
export interface MediaAsset { src: string; width: number; height: number; thumbnail: string; thumbnails: Thumbnail[] }
export interface GalleryImage extends MediaAsset { source: string; title: string; description: string; alt: string; date: string }
export interface Skin { id: string; title: string; description: string; date: string; author: string; download: string; order: number | null; cover: string; images: GalleryImage[] }
export interface EntryInfo { id: string; route: string; draft: boolean; title: string; summary: string; date: string }
export const media: { revision: string; assets: Record<string, MediaAsset>; drawing: GalleryImage[]; skins: Skin[]; contact: GalleryImage[]; entries: Record<string, EntryInfo> } = generated;
