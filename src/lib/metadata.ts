import type { Metadata } from 'next';
import { getTool, type ToolMode } from './tools';
import { SITE_URL } from './config';

/** Build per-tool metadata with canonical URL, Open Graph and Twitter cards. */
export function toolMetadata(mode: ToolMode): Metadata {
  const tool = getTool(mode);
  const path = `/${tool.slug}`;
  return {
    title: tool.seoTitle,
    description: tool.description,
    alternates: { canonical: path },
    openGraph: {
      title: tool.seoTitle,
      description: tool.description,
      url: `${SITE_URL}${path}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: tool.seoTitle,
      description: tool.description,
    },
  };
}
