import type { Metadata } from 'next';
import { AnonymizerWorkbench } from '@/components/anonymizer/AnonymizerWorkbench';
import { ToolPageShell } from '@/components/workbench/ToolPageShell';
import { toolMetadata } from '@/lib/metadata';
import { SAMPLE_ANON_YAML } from '@/lib/samples';

export const metadata: Metadata = toolMetadata('yaml-anonymizer');

export default function Page() {
  return (
    <ToolPageShell
      mode="yaml-anonymizer"
      privacyNote="Anonymization runs entirely in your browser. Your original data is never uploaded, logged, or stored."
    >
      <AnonymizerWorkbench
        language="yaml"
        operationKind="anonymize-yaml"
        sample={SAMPLE_ANON_YAML}
      />
    </ToolPageShell>
  );
}
