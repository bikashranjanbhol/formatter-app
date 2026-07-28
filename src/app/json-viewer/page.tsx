import type { Metadata } from 'next';
import { ToolPage } from '@/components/workbench/ToolPage';
import { toolMetadata } from '@/lib/metadata';

export const metadata: Metadata = toolMetadata('json-viewer');

export default function Page() {
  return <ToolPage mode="json-viewer" />;
}
