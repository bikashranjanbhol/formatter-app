'use client';

import Link from 'next/link';
import type { Detection } from '@/lib/detect';
import { isSupported } from '@/lib/detect';
import { TOOLS, type ToolMode } from '@/lib/tools';

interface FormatHintProps {
  detection: Detection;
  /** The language this tool expects. */
  expected: 'json' | 'yaml';
  onDismiss: () => void;
}

/**
 * Shown when the pasted document does not look like what this tool expects.
 *
 * Most people arrive from a search result and paste whatever they have. Rather
 * than leaving them with a parse error, point at the tool that handles what
 * they actually pasted — or, for a format we do not support yet, say so plainly
 * instead of implying a link that does not exist.
 */
export function FormatHint({ detection, expected, onDismiss }: FormatHintProps) {
  const target = suggestedTool(detection.format, expected);

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      role="status"
    >
      <span>
        This looks like <span className="font-semibold">{detection.label}</span>, but you are on a{' '}
        {expected.toUpperCase()} tool.
      </span>

      {target ? (
        <Link
          href={`/${target.slug}`}
          className="font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          Open the {target.nav} →
        </Link>
      ) : (
        <span className="text-amber-800/80 dark:text-amber-300/80">
          We don’t have a {detection.label} tool yet — converting it to {expected.toUpperCase()}{' '}
          first will work.
        </span>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto rounded-md px-2 py-0.5 text-xs font-medium underline decoration-dotted hover:bg-amber-100 dark:hover:bg-amber-900/60"
      >
        Dismiss
      </button>
    </div>
  );
}

/**
 * Pick the tool to point at. Prefers the formatter for the detected language,
 * which is the most likely intent and always exists.
 */
function suggestedTool(format: Detection['format'], expected: 'json' | 'yaml') {
  if (!isSupported(format)) return undefined;
  const language = format === 'json' ? 'json' : 'yaml';
  if (language === expected) return undefined;
  const slug: ToolMode = language === 'json' ? 'json-formatter' : 'yaml-formatter';
  return TOOLS.find((tool) => tool.slug === slug);
}
