import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';
import { TOOLS, STATIC_PAGES } from '@/lib/tools';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: string[] = [
    '/',
    ...TOOLS.map((t) => `/${t.slug}`),
    ...STATIC_PAGES.map((p) => `/${p.slug}`),
  ];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path.startsWith('/json') || path.startsWith('/yaml') ? 0.8 : 0.5,
  }));
}
