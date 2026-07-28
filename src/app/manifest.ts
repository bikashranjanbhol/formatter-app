import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'JSON/YAML',
    description: SITE_TAGLINE,
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#195cf5',
    // A single scalable SVG icon ships by default. PNG raster icons
    // (icon-192.png / icon-512.png) are documented placeholders you can add to
    // /public/icons for broader install-prompt support; see the README.
    icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
