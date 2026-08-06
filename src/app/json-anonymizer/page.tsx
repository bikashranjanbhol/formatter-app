import type { Metadata } from 'next';
import { AnonymizerWorkbench } from '@/components/anonymizer/AnonymizerWorkbench';
import { ToolPageShell } from '@/components/workbench/ToolPageShell';
import { toolMetadata } from '@/lib/metadata';
import { SAMPLE_ANON } from '@/lib/samples';

export const metadata: Metadata = toolMetadata('json-anonymizer');

export default function Page() {
  return (
    <ToolPageShell
      mode="json-anonymizer"
      privacyNote="Anonymization runs entirely in your browser. Your original data is never uploaded, logged, or stored."
    >
      <AnonymizerWorkbench language="json" operationKind="anonymize-json" sample={SAMPLE_ANON} />
    </ToolPageShell>
  );
}
