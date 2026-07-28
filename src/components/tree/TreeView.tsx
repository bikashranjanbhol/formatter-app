'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { TreeNode } from '@/lib/types';
import {
  ChevronRightIcon,
  SearchIcon,
  CopyIcon,
  LinkIcon,
  ExpandIcon,
  CollapseIcon,
} from '../editor/icons';

interface TreeViewProps {
  root: TreeNode;
  nodeCount: number;
  onCopy?: (text: string, description: string) => void;
}

const typeColors: Record<TreeNode['type'], string> = {
  string: 'text-emerald-600 dark:text-emerald-400',
  number: 'text-sky-600 dark:text-sky-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  null: 'text-slate-400 dark:text-slate-500',
  object: 'text-slate-500 dark:text-slate-400',
  array: 'text-slate-500 dark:text-slate-400',
};

// Above this many nodes we avoid auto-expanding everything to keep rendering
// responsive; users can still expand branches on demand.
const LARGE_TREE_THRESHOLD = 5000;

export function TreeView({ root, nodeCount, onCopy }: TreeViewProps) {
  const [query, setQuery] = useState('');
  const [expandVersion, setExpandVersion] = useState(0);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  const matchedPaths = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    const matches = new Set<string>();
    const walk = (node: TreeNode, ancestors: string[]): boolean => {
      const selfMatch =
        node.key.toLowerCase().includes(q) || node.preview.toLowerCase().includes(q);
      let childMatch = false;
      if (node.children) {
        for (const child of node.children) {
          if (walk(child, [...ancestors, node.path])) childMatch = true;
        }
      }
      if (selfMatch || childMatch) {
        matches.add(node.path);
        for (const a of ancestors) matches.add(a);
        return true;
      }
      return false;
    };
    walk(root, []);
    return matches;
  }, [query, root]);

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setExpandVersion((v) => v + 1);
  }, []);
  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setExpandVersion((v) => v + 1);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 p-2 dark:border-slate-800">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <label className="sr-only" htmlFor="tree-search">
            Search keys and values
          </label>
          <input
            id="tree-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keys and values…"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm shadow-sm focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <button type="button" className="btn" onClick={handleExpandAll} title="Expand all branches">
          <ExpandIcon />
          <span className="hidden sm:inline">Expand all</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleCollapseAll}
          title="Collapse all branches"
        >
          <CollapseIcon />
          <span className="hidden sm:inline">Collapse all</span>
        </button>
      </div>
      {nodeCount > LARGE_TREE_THRESHOLD && (
        <p className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Large document ({nodeCount.toLocaleString()} nodes). Branches start collapsed for
          performance — expand what you need.
        </p>
      )}
      <div className="flex-1 overflow-auto p-1.5 font-mono text-[13px] leading-6">
        <ul role="tree" aria-label="Document tree">
          {root.children ? (
            root.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={0}
                matchedPaths={matchedPaths}
                defaultExpanded={nodeCount <= LARGE_TREE_THRESHOLD}
                forceExpand={expandAll}
                expandVersion={expandVersion}
                onCopy={onCopy}
              />
            ))
          ) : (
            <TreeItem
              node={root}
              depth={0}
              matchedPaths={matchedPaths}
              defaultExpanded
              forceExpand={expandAll}
              expandVersion={expandVersion}
              onCopy={onCopy}
            />
          )}
        </ul>
      </div>
    </div>
  );
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  matchedPaths: Set<string> | null;
  defaultExpanded: boolean;
  forceExpand: boolean | null;
  expandVersion: number;
  onCopy?: (text: string, description: string) => void;
}

function TreeItem({
  node,
  depth,
  matchedPaths,
  defaultExpanded,
  forceExpand,
  expandVersion,
  onCopy,
}: TreeItemProps) {
  const isBranch = node.type === 'object' || node.type === 'array';
  const [open, setOpen] = useState(defaultExpanded && depth < 2);

  // React to expand/collapse-all requests.
  useEffect(() => {
    if (forceExpand !== null) setOpen(forceExpand);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandVersion]);

  if (matchedPaths && !matchedPaths.has(node.path)) return null;

  const copyValue = () => {
    const text = node.rawValue !== undefined ? String(node.rawValue) : node.preview; // container preview
    onCopy?.(text, `value at ${node.path || '(root)'}`);
  };
  const copyPath = () => onCopy?.(node.path || '/', `path ${node.path || '/'}`);

  const bracket = node.type === 'array' ? '[ ]' : '{ }';

  return (
    <li role="treeitem" aria-selected={false} aria-expanded={isBranch ? open : undefined}>
      <div
        className="group flex items-center gap-1.5 rounded-md py-0.5 pr-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70"
        style={{ paddingLeft: `${depth * 18 + 4}px` }}
      >
        {isBranch ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label={open ? `Collapse ${node.key || 'root'}` : `Expand ${node.key || 'root'}`}
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

        {node.key !== '' && (
          <span className="font-medium text-slate-700 dark:text-slate-200">{node.key}</span>
        )}
        {node.key !== '' && <span className="text-slate-400">:</span>}

        {isBranch ? (
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-400 dark:text-slate-500">{bracket}</span>
            <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {node.preview}
            </span>
          </span>
        ) : (
          <span className={`truncate ${typeColors[node.type]}`}>{node.preview}</span>
        )}

        <span className="ml-auto flex items-center gap-0.5 pl-2 opacity-100 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={copyValue}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title="Copy value"
            aria-label={`Copy value at ${node.path || 'root'}`}
          >
            <CopyIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={copyPath}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title="Copy JSON Pointer path"
            aria-label={`Copy path ${node.path || '/'}`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      {isBranch && open && node.children && (
        <ul role="group">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
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
