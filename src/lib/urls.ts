import { media } from './media';

export function withBase(value: string): string {
  const prefix = import.meta.env.BASE_URL.replace(/\/$/, '');
  const encoded = value.replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return prefix + '/' + encoded + (encoded && value.endsWith('/') ? '/' : '');
}

export function resourceUrl(value: string): string {
  const key = value.replace(/^\/+/, '');
  return withBase('resource/' + (media.assets[key]?.src || key));
}
