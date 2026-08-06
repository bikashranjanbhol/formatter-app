import { Workbench } from './Workbench';
import { ToolPageShell } from './ToolPageShell';
import type { ToolMode } from '@/lib/tools';

/**
 * Tool page for the tools driven by the generic `Workbench` editor. Everything
 * around the editor — headings, SEO content, structured data — comes from
 * `ToolPageShell`, which is shared with the bespoke tool pages.
 */
export function ToolPage({ mode }: { mode: ToolMode }) {
  return (
    <ToolPageShell mode={mode}>
      <Workbench mode={mode} />
    </ToolPageShell>
  );
}
