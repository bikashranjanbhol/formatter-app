'use client';

import { formatBytes } from '@/lib/files/upload';
import type { DocumentStats } from '@/lib/types';

export type Validity = 'valid' | 'invalid' | 'unknown';

interface StatusBarProps {
  documentType: string;
  validity: Validity;
  stats: DocumentStats;
  processingMs: number | null;
  offloaded: boolean;
}

const validityStyles: Record<Validity, string> = {
  valid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  invalid: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const validityLabel: Record<Validity, string> = {
  valid: '● Valid',
  invalid: '▲ Invalid',
  unknown: '○ Not checked',
};

export function StatusBar({
  documentType,
  validity,
  stats,
  processingMs,
  offloaded,
}: StatusBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      role="status"
      aria-live="polite"
    >
      <span className="font-medium uppercase tracking-wide">{documentType}</span>
      <span className={`rounded px-1.5 py-0.5 font-medium ${validityStyles[validity]}`}>
        {validityLabel[validity]}
      </span>
      <span>{stats.lines} lines</span>
      <span>{stats.characters.toLocaleString()} chars</span>
      <span>{formatBytes(stats.bytes)}</span>
      {processingMs !== null && (
        <span>
          {processingMs.toFixed(processingMs < 10 ? 1 : 0)} ms{offloaded ? ' (worker)' : ''}
        </span>
      )}
    </div>
  );
}
