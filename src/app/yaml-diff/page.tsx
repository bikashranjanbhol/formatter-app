import type { Metadata } from 'next';
import { DiffWorkbench } from '@/components/diff/DiffWorkbench';
import { ToolPageShell } from '@/components/workbench/ToolPageShell';
import { toolMetadata } from '@/lib/metadata';
import { SAMPLE_DIFF_LEFT_YAML, SAMPLE_DIFF_RIGHT_YAML } from '@/lib/samples';

export const metadata: Metadata = toolMetadata('yaml-diff');

export default function Page() {
  return (
    <ToolPageShell
      mode="yaml-diff"
      privacyNote="Both files are parsed and compared entirely in your browser. Neither one, nor the generated patch, is ever uploaded, logged, or stored."
    >
      <DiffWorkbench
        language="yaml"
        operationKind="diff-yaml"
        sampleLeft={SAMPLE_DIFF_LEFT_YAML}
        sampleRight={SAMPLE_DIFF_RIGHT_YAML}
      />
    </ToolPageShell>
  );
}
