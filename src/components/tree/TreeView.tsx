'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { TreeNode } from '@/lib/types';

interface TreeViewProps {
  root: TreeNode;
  nodeCount: number;
  onCopy?: (text: string, description: string) => void;
}

const typeColors: Record<TreeNode['type'], string> = {
  string: 'text-emerald-700 dark:text-emerald-400',
  number: 'text-sky-700 dark:text-sky-400',
  boolean: 'text-purple-700 dark:text-purple-400',
  null: 'text-slate-500',
  object: 'text-slate-700 dark:text-slate-300',
  array: 'text-slate-700 dark:text-slate-300',
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-2 dark:border-slate-800">
        <label className="sr-only" htmlFor="tree-search">
          Search keys and values
        </label>
        <input
          id="tree-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keys and values…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button type="button" className="btn" onClick={handleExpandAll}>
          Expand all
        </button>
        <button type="button" className="btn" onClick={handleCollapseAll}>
          Collapse all
        </button>
      </div>
      {nodeCount > LARGE_TREE_THRESHOLD && (
        <p className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Large document ({nodeCount.toLocaleString()} nodes). Branches start collapsed for
          performance — expand what you need.
        </p>
      )}
      <div className="flex-1 overflow-auto p-2 font-mono text-sm">
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

  return (
    <li role="treeitem" aria-selected={false} aria-expanded={isBranch ? open : undefined}>
      <div
        className="group flex items-center gap-1 rounded px-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {isBranch ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-4 shrink-0 text-slate-400"
            aria-label={open ? `Collapse ${node.key}` : `Expand ${node.key}`}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}
        <span className="text-slate-800 dark:text-slate-200">
          {node.key !== '' && <span className="text-slate-500">{node.key}: </span>}
        </span>
        <span className={typeColors[node.type]}>{node.preview}</span>
        <span className="ml-auto hidden gap-1 group-hover:flex">
          <button
            type="button"
            onClick={copyValue}
            className="rounded px-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Copy value"
          >
            copy
          </button>
          <button
            type="button"
            onClick={copyPath}
            className="rounded px-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Copy JSON Pointer path"
          >
            path
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
