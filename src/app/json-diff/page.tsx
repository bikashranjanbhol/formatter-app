import type { Metadata } from 'next';
import { DiffWorkbench } from '@/components/diff/DiffWorkbench';
import { ToolPageShell } from '@/components/workbench/ToolPageShell';
import { toolMetadata } from '@/lib/metadata';
import { SAMPLE_DIFF_LEFT, SAMPLE_DIFF_RIGHT } from '@/lib/samples';

export const metadata: Metadata = toolMetadata('json-diff');

export default function Page() {
  return (
    <ToolPageShell
      mode="json-diff"
      privacyNote="Both documents are parsed and compared entirely in your browser. Neither one, nor the generated patch, is ever uploaded, logged, or stored."
    >
      <DiffWorkbench
        language="json"
        operationKind="diff-json"
        sampleLeft={SAMPLE_DIFF_LEFT}
        sampleRight={SAMPLE_DIFF_RIGHT}
      />
    </ToolPageShell>
  );
}
