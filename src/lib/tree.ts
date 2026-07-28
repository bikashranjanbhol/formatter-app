import type { TreeNode } from './types';
import { escapePointer } from './json/parse';

const MAX_PREVIEW = 60;

function scalarType(value: unknown): TreeNode['type'] {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'null';
  }
}

function previewScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const text = value.length > MAX_PREVIEW ? `${value.slice(0, MAX_PREVIEW)}…` : value;
    return JSON.stringify(text);
  }
  return String(value);
}

function previewContainer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length === 1 ? '1 item' : `${value.length} items`;
  }
  const count = Object.keys(value as Record<string, unknown>).length;
  return count === 1 ? '1 key' : `${count} keys`;
}

/**
 * Build a collapsible tree from an already-parsed JS value. Paths are RFC 6901
 * JSON Pointers so individual nodes can be copied or linked precisely.
 */
export function buildTree(value: unknown, key = '', path = ''): TreeNode {
  if (Array.isArray(value)) {
    return {
      key,
      path,
      type: 'array',
      preview: previewContainer(value),
      children: value.map((item, index) => buildTree(item, String(index), `${path}/${index}`)),
    };
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return {
      key,
      path,
      type: 'object',
      preview: previewContainer(value),
      children: entries.map(([k, v]) => buildTree(v, k, `${path}/${escapePointer(k)}`)),
    };
  }
  return {
    key,
    path,
    type: scalarType(value),
    preview: previewScalar(value),
    rawValue: value as string | number | boolean | null,
  };
}

/** Count the total number of nodes in a tree, used to decide on virtualization. */
export function countNodes(node: TreeNode): number {
  if (!node.children) return 1;
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}
