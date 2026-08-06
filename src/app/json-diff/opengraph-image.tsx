import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { getTool } from '@/lib/tools';

const tool = getTool('json-diff');

export const alt = tool.seoTitle;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: tool.title, subtitle: tool.description, badge: tool.group });
}
