import generated from '../generated/media.json';

export interface GalleryImage {
  src: string;
  title: string;
  description: string;
  alt: string;
  date: string;
}

export interface Skin {
  id: string;
  title: string;
  description: string;
  date: string;
  author: string;
  download: string;
  order: number | null;
  cover: string;
  images: GalleryImage[];
}

// Explicit types also support an empty gallery on a fresh site.
export const media: { drawing: GalleryImage[]; skins: Skin[] } = generated;
