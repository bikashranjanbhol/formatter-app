'use client';

import { useState } from 'react';
import type { RepairResult } from '@/lib/json/repair';

interface RepairPanelProps {
  result: RepairResult;
  /** Called with the repaired document when the user accepts the fixes. */
  onApply: (repaired: string) => void;
}

/**
 * Offers the fixes that would make an invalid document parse.
 *
 * Nothing is applied automatically. The panel names each fix, says how many
 * times it applies and why it is needed, and shows the repaired document before
 * the user commits to it — so the tool stays true to "no silent repair" while
 * still helping with the trailing comma that brought most people here.
 */
export function RepairPanel({ result, onApply }: RepairPanelProps) {
  const [showPreview, setShowPreview] = useState(false);

  const total = result.suggestions.reduce((sum, s) => sum + s.count, 0);

  return (
    <section
      aria-label="Suggested fixes"
      className="rounded-md border border-sky-300 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950/40"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-200">
          ✎ {total === 1 ? '1 suggested fix' : `${total} suggested fixes`}
        </h3>
        <span className="text-xs text-sky-800/80 dark:text-sky-300/80">
          {result.ok
            ? 'Applying these makes the document valid.'
            : 'These help, but the document will still have an error afterwards.'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-medium text-sky-800 underline decoration-dotted hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/60"
            onClick={() => setShowPreview((v) => !v)}
            aria-expanded={showPreview}
          >
            {showPreview ? 'Hide preview' : 'Preview result'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onApply(result.output)}>
            Apply {result.suggestions.length === 1 ? 'fix' : 'fixes'}
          </button>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5 text-sm text-sky-900 dark:text-sky-200">
        {result.suggestions.map((suggestion) => (
          <li key={suggestion.fix} className="flex gap-2">
            <span
              className="mt-0.5 shrink-0 rounded-full bg-sky-200 px-1.5 text-xs font-semibold text-sky-900 dark:bg-sky-900 dark:text-sky-200"
              aria-hidden
            >
              ×{suggestion.count}
            </span>
            <span>
              <span className="font-medium">{suggestion.title}</span>
              <span className="sr-only"> — applies {suggestion.count} times.</span>{' '}
              <span className="text-sky-800/80 dark:text-sky-300/80">{suggestion.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {!result.ok && result.remainingError && (
        <p className="mt-2 text-sm font-medium text-sky-900 dark:text-sky-200">
          Remaining after these fixes:{' '}
          {result.remainingError.line ? `line ${result.remainingError.line} — ` : ''}
          {result.remainingError.message}
        </p>
      )}

      {showPreview && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-sky-200 bg-white p-2 font-mono text-xs dark:border-sky-900 dark:bg-slate-900">
          <code>{result.output}</code>
        </pre>
      )}
    </section>
  );
}
