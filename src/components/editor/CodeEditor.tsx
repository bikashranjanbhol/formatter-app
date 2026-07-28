'use client';

import dynamic from 'next/dynamic';
import type { CodeEditorInnerProps } from './CodeEditorInner';

/**
 * Lazily-loaded CodeMirror editor. The editor bundle (CodeMirror + language
 * modes) is large, so it is code-split and only downloaded on the client.
 */
const CodeEditorInner = dynamic(() => import('./CodeEditorInner'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-400 dark:bg-slate-900"
      role="status"
      aria-live="polite"
    >
      Loading editor…
    </div>
  ),
});

export function CodeEditor(props: CodeEditorInnerProps) {
  return <CodeEditorInner {...props} />;
}
