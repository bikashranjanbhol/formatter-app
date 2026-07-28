import type { Metadata } from 'next';
import { ToolPage } from '@/components/workbench/ToolPage';
import { toolMetadata } from '@/lib/metadata';

export const metadata: Metadata = toolMetadata('yaml-to-json');

export default function Page() {
  return <ToolPage mode="yaml-to-json" />;
}
