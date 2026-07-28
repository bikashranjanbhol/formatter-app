import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { SITE_TAGLINE } from '@/lib/config';

export const alt = 'Private, schema-aware JSON & YAML tools that run in your browser';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: 'JSON & YAML Workbench',
    subtitle: SITE_TAGLINE,
    badge: 'Private developer tools',
  });
}
