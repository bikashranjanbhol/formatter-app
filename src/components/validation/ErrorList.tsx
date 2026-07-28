'use client';

import type { EngineError } from '@/lib/types';

interface ErrorListProps {
  errors: EngineError[];
  warnings: EngineError[];
  notes?: string[];
  onSelectLocation?: (line: number, column?: number) => void;
}

/**
 * Accessible display of validation results. Results are announced to screen
 * readers via aria-live, and severity is conveyed with text + icon (never
 * color alone).
 */
export function ErrorList({ errors, warnings, notes, onSelectLocation }: ErrorListProps) {
  const hasContent = errors.length > 0 || warnings.length > 0 || (notes && notes.length > 0);
  if (!hasContent) return null;

  return (
    <div className="space-y-2" aria-live="polite">
      {errors.length > 0 && (
        <section
          aria-label="Errors"
          className="rounded-md border border-rose-300 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/40"
        >
          <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            ✕ {errors.length} error{errors.length > 1 ? 's' : ''}
          </h3>
          <ul className="mt-1 space-y-1 text-sm text-rose-700 dark:text-rose-300">
            {errors.map((e, i) => (
              <li key={i}>
                <Location error={e} onSelect={onSelectLocation} />
                {e.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section
          aria-label="Warnings"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40"
        >
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ⚠ {warnings.length} warning{warnings.length > 1 ? 's' : ''}
          </h3>
          <ul className="mt-1 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {warnings.map((e, i) => (
              <li key={i}>
                <Location error={e} onSelect={onSelectLocation} />
                {e.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes && notes.length > 0 && (
        <section
          aria-label="Notes"
          className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <ul className="space-y-1">
            {notes.map((n, i) => (
              <li key={i}>ℹ {n}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Location({
  error,
  onSelect,
}: {
  error: EngineError;
  onSelect?: (line: number, column?: number) => void;
}) {
  const label = error.instancePath
    ? error.instancePath || '(root)'
    : error.line
      ? `Line ${error.line}${error.column ? `:${error.column}` : ''}`
      : null;
  if (!label) return null;
  if (error.line && onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(error.line!, error.column)}
        className="mr-2 rounded bg-white/60 px-1 font-mono text-xs underline decoration-dotted hover:bg-white dark:bg-black/20"
      >
        {label}
      </button>
    );
  }
  return <span className="mr-2 font-mono text-xs opacity-80">{label}</span>;
}
