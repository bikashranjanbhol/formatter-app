'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DiffNode, DiffStatus, DiffSummary } from '@/lib/diff';
import { ChevronRightIcon, LinkIcon, ExpandIcon, CollapseIcon, SearchIcon } from '../editor/icons';

interface DiffViewProps {
  root: DiffNode;
  summary: DiffSummary;
  identical: boolean;
  onCopy?: (text: string, description: string) => void;
}

/**
 * Status is never conveyed by colour alone: every row carries a glyph and an
 * accessible label as well, so the diff is readable with colour vision
 * deficiency or a screen reader.
 */
const STATUS_META: Record<DiffStatus, { glyph: string; label: string; row: string; chip: string }> =
  {
    added: {
      glyph: '+',
      label: 'Added',
      row: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      chip: 'text-emerald-700 dark:text-emerald-400',
    },
    removed: {
      glyph: '−',
      label: 'Removed',
      row: 'bg-rose-50/70 dark:bg-rose-950/30',
      chip: 'text-rose-700 dark:text-rose-400',
    },
    changed: {
      glyph: '~',
      label: 'Changed',
      row: 'bg-amber-50/70 dark:bg-amber-950/30',
      chip: 'text-amber-700 dark:text-amber-400',
    },
    unchanged: {
      glyph: ' ',
      label: 'Unchanged',
      row: '',
      chip: 'text-slate-500 dark:text-slate-400',
    },
  };

const LARGE_DIFF_THRESHOLD = 3000;

function countNodes(node: DiffNode): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0);
}

export function DiffView({ root, summary, identical, onCopy }: DiffViewProps) {
  const [hideUnchanged, setHideUnchanged] = useState(true);
  const [query, setQuery] = useState('');
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  const [expandVersion, setExpandVersion] = useState(0);

  const nodeCount = useMemo(() => countNodes(root), [root]);

  /** Paths to render, when a search filter is active. */
  const matchedPaths = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const matches = new Set<string>();
    const walk = (node: DiffNode, ancestors: string[]): boolean => {
      const selfMatch =
        node.key.toLowerCase().includes(q) ||
        (node.left?.toLowerCase().includes(q) ?? false) ||
        (node.right?.toLowerCase().includes(q) ?? false);
      let childMatch = false;
      for (const child of node.children ?? []) {
        if (walk(child, [...ancestors, node.path])) childMatch = true;
      }
      if (selfMatch || childMatch) {
        matches.add(node.path);
        for (const ancestor of ancestors) matches.add(ancestor);
        return true;
      }
      return false;
    };
    walk(root, []);
    return matches;
  }, [query, root]);

  const children = root.children ?? [root];

  return (
    <div className="flex h-full flex-col">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 p-2 dark:border-slate-800">
        {identical ? (
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            ✓ The documents are identical.
          </p>
        ) : (
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="Difference summary">
            <SummaryChip status="added" count={summary.added} />
            <SummaryChip status="removed" count={summary.removed} />
            <SummaryChip status="changed" count={summary.changed} />
            {summary.moved > 0 && (
              <li className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                ⇄ {summary.moved} moved
              </li>
            )}
          </ul>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={hideUnchanged}
              onChange={(e) => setHideUnchanged(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Hide unchanged
          </label>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setExpandAll(true);
              setExpandVersion((v) => v + 1);
            }}
            title="Expand all branches"
            aria-label="Expand all branches"
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setExpandAll(false);
              setExpandVersion((v) => v + 1);
            }}
            title="Collapse all branches"
            aria-label="Collapse all branches"
          >
            <CollapseIcon />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-slate-200/80 p-2 dark:border-slate-800">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <label className="sr-only" htmlFor="diff-search">
            Search keys and values in the comparison
          </label>
          <input
            id="diff-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keys and values…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm shadow-sm focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      {nodeCount > LARGE_DIFF_THRESHOLD && (
        <p className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Large comparison ({nodeCount.toLocaleString()} nodes). Branches start collapsed — expand
          what you need.
        </p>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr] gap-2 border-b border-slate-200/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>Left</span>
        <span>Right</span>
      </div>

      <div className="flex-1 overflow-auto p-1.5 font-mono text-[13px] leading-6">
        <ul role="tree" aria-label="Document comparison">
          {children.map((child, index) => (
            <DiffItem
              key={`${child.path}:${index}`}
              node={child}
              depth={0}
              hideUnchanged={hideUnchanged}
              matchedPaths={matchedPaths}
              defaultExpanded={nodeCount <= LARGE_DIFF_THRESHOLD}
              forceExpand={expandAll}
              expandVersion={expandVersion}
              onCopy={onCopy}
            />
          ))}
        </ul>
        {identical && hideUnchanged && (
          <p className="p-3 font-sans text-sm text-slate-500">
            Nothing to show — every value matches. Untick “Hide unchanged” to browse the document.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryChip({ status, count }: { status: DiffStatus; count: number }) {
  const meta = STATUS_META[status];
  return (
    <li
      className={`rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800 ${meta.chip}`}
    >
      {meta.glyph} {count} {meta.label.toLowerCase()}
    </li>
  );
}

interface DiffItemProps {
  node: DiffNode;
  depth: number;
  hideUnchanged: boolean;
  matchedPaths: Set<string> | null;
  defaultExpanded: boolean;
  forceExpand: boolean | null;
  expandVersion: number;
  onCopy?: (text: string, description: string) => void;
}

function DiffItem({
  node,
  depth,
  hideUnchanged,
  matchedPaths,
  defaultExpanded,
  forceExpand,
  expandVersion,
  onCopy,
}: DiffItemProps) {
  const isBranch = Boolean(node.children && node.children.length > 0);
  // Differences start open so the user sees them without hunting; unchanged
  // branches start closed to keep the list short.
  const [open, setOpen] = useState(
    defaultExpanded && (node.status !== 'unchanged' || depth < 1) && depth < 4,
  );

  useEffect(() => {
    if (forceExpand !== null) setOpen(forceExpand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandVersion]);

  if (hideUnchanged && node.status === 'unchanged' && !node.moved) return null;
  if (matchedPaths && !matchedPaths.has(node.path)) return null;

  const meta = STATUS_META[node.status];
  const label = node.key === '' ? '(root)' : node.key;

  return (
    <li role="treeitem" aria-selected={false} aria-expanded={isBranch ? open : undefined}>
      <div
        className={`group rounded-md py-0.5 pr-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70 ${meta.row}`}
      >
        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 18 + 4}px` }}>
          {isBranch ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
            >
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
              />
            </button>
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </span>
          )}

          <span
            className={`w-4 shrink-0 text-center font-bold ${meta.chip}`}
            title={meta.label}
            aria-hidden
          >
            {meta.glyph}
          </span>
          <span className="sr-only">{meta.label}:</span>

          <span className="truncate font-medium text-slate-700 dark:text-slate-200">{label}</span>
          {node.moved && (
            <span
              className="shrink-0 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              title={`Moved from index ${node.leftIndex} to ${node.rightIndex}`}
            >
              ⇄ {node.leftIndex} → {node.rightIndex}
            </span>
          )}

          <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-2 opacity-100 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onCopy?.(node.path || '/', `path ${node.path || '/'}`)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              title="Copy JSON Pointer path"
              aria-label={`Copy path ${node.path || '/'}`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>

        {/* Value columns */}
        <div
          className="grid grid-cols-[1fr_1fr] gap-2 pr-1 text-xs"
          style={{ paddingLeft: `${depth * 18 + 34}px` }}
        >
          <ValueCell
            text={node.left}
            type={node.leftType}
            dim={node.status === 'added'}
            emphasise={node.status === 'changed' || node.status === 'removed'}
          />
          <ValueCell
            text={node.right}
            type={node.rightType}
            dim={node.status === 'removed'}
            emphasise={node.status === 'changed' || node.status === 'added'}
          />
        </div>
      </div>

      {isBranch && open && (
        <ul role="group">
          {node.children!.map((child, index) => (
            <DiffItem
              key={`${child.path}:${index}`}
              node={child}
              depth={depth + 1}
              hideUnchanged={hideUnchanged}
              matchedPaths={matchedPaths}
              defaultExpanded={defaultExpanded}
              forceExpand={forceExpand}
              expandVersion={expandVersion}
              onCopy={onCopy}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function ValueCell({
  text,
  type,
  dim,
  emphasise,
}: {
  text?: string;
  type: DiffNode['leftType'];
  dim: boolean;
  emphasise: boolean;
}) {
  if (type === 'absent') {
    return (
      <span className="truncate italic text-slate-400 dark:text-slate-600">
        <span className="sr-only">not present</span>
        <span aria-hidden>—</span>
      </span>
    );
  }
  return (
    <span
      className={`truncate ${dim ? 'text-slate-400 dark:text-slate-600' : ''} ${
        emphasise
          ? 'font-semibold text-slate-800 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-400'
      }`}
      title={text}
    >
      {text}
    </span>
  );
}
