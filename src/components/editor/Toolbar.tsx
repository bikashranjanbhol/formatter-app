'use client';

import type { FormatOptions, IndentStyle, LineEnding } from '@/lib/types';

interface ToolbarProps {
  options: FormatOptions;
  onOptionsChange: (patch: Partial<FormatOptions>) => void;
  showYamlVersion: boolean;
  showSortKeys: boolean;
}

/** Formatting-settings controls shared across tools. */
export function Toolbar({ options, onOptionsChange, showYamlVersion, showSortKeys }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <label className="flex items-center gap-1.5">
        <span className="text-slate-500">Indent</span>
        <select
          className="rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={options.indent}
          onChange={(e) => onOptionsChange({ indent: e.target.value as IndentStyle })}
        >
          <option value="two-space">2 spaces</option>
          <option value="four-space">4 spaces</option>
          <option value="tab">Tab</option>
        </select>
      </label>

      <label className="flex items-center gap-1.5">
        <span className="text-slate-500">Line endings</span>
        <select
          className="rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={options.lineEnding}
          onChange={(e) => onOptionsChange({ lineEnding: e.target.value as LineEnding })}
        >
          <option value="lf">LF</option>
          <option value="crlf">CRLF</option>
        </select>
      </label>

      {showYamlVersion && (
        <label className="flex items-center gap-1.5">
          <span className="text-slate-500">YAML</span>
          <select
            className="rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
            value={options.yamlVersion ?? '1.2'}
            onChange={(e) => onOptionsChange({ yamlVersion: e.target.value as '1.1' | '1.2' })}
          >
            <option value="1.2">1.2</option>
            <option value="1.1">1.1</option>
          </select>
        </label>
      )}

      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={options.finalNewline}
          onChange={(e) => onOptionsChange({ finalNewline: e.target.checked })}
        />
        <span>Final newline</span>
      </label>

      {showSortKeys && (
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={options.sortKeys}
            onChange={(e) => onOptionsChange({ sortKeys: e.target.checked })}
          />
          <span>Sort keys</span>
        </label>
      )}
    </div>
  );
}
