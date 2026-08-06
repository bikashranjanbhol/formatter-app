/**
 * Structural diff for JSON and YAML documents.
 *
 * This is a *data* diff, not a text diff: documents are parsed to values and
 * compared by structure, so reformatting, key reordering, and whitespace never
 * show up as changes. Objects are compared by key (order-insensitive, because
 * JSON objects are unordered); arrays are compared positionally by default, or
 * matched by an identity key, or treated as unordered sets.
 *
 * Pure and DOM-free so it runs on the main thread, in the Web Worker, and in a
 * future CLI. It never mutates its inputs.
 */

import type { EngineError } from '../types';
import { escapePointer } from '../json/parse';
import { previewValue, valueType, type ValueType } from '../value';

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

/** `absent` means the value does not exist on that side at all. */
export type DiffValueType = ValueType | 'absent';

export interface DiffNode {
  /** Object key or array index label. Empty string for the root. */
  key: string;
  /** RFC 6901 JSON Pointer, relative to the document root. */
  path: string;
  status: DiffStatus;
  leftType: DiffValueType;
  rightType: DiffValueType;
  /** Short, human-readable rendering of each side. */
  left?: string;
  right?: string;
  /** Original array indices, when the node is an array item. */
  leftIndex?: number;
  rightIndex?: number;
  /** True when an identity-matched array item sits at a different index. */
  moved?: boolean;
  children?: DiffNode[];
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  moved: number;
}

export type ArrayStrategy = 'index' | 'key' | 'unordered';

export interface DiffOptions {
  /**
   * How array items are paired up:
   * - `index` (default): position by position.
   * - `key`: objects are matched by the value of `arrayKey`, so inserts and
   *   reorders do not cascade into false differences.
   * - `unordered`: arrays are compared as sets, ignoring position entirely.
   */
  arrayStrategy: ArrayStrategy;
  /** Identity key used by the `key` strategy (e.g. "id"). */
  arrayKey: string;
  /** Compare strings case-insensitively. */
  ignoreCase: boolean;
  /** Ignore leading and trailing whitespace in strings. */
  trimStrings: boolean;
  /** Treat a missing key and an explicit null as equivalent. */
  nullEqualsAbsent: boolean;
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  arrayStrategy: 'index',
  arrayKey: 'id',
  ignoreCase: false,
  trimStrings: false,
  nullEqualsAbsent: false,
};

export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

export interface DiffResult {
  ok: boolean;
  root?: DiffNode;
  summary?: DiffSummary;
  /** True when the two documents carry identical data under the chosen options. */
  identical?: boolean;
  /** RFC 6902 JSON Patch that turns the left document into the right one. */
  patch?: JsonPatchOp[];
  /** RFC 7386 JSON Merge Patch. Cannot express array edits or key deletion vs null. */
  mergePatch?: unknown;
  errors: EngineError[];
  warnings: EngineError[];
  notes?: string[];
}

/** Sentinel for "this side has no value here at all". */
const ABSENT = Symbol('absent');
type Side = unknown | typeof ABSENT;

// ---------------------------------------------------------------------------
// Comparison primitives
// ---------------------------------------------------------------------------

function normalizeScalar(value: unknown, options: DiffOptions): unknown {
  if (typeof value !== 'string') return value;
  let text = value;
  if (options.trimStrings) text = text.trim();
  if (options.ignoreCase) text = text.toLowerCase();
  return text;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep structural equality, honouring the comparison options. */
export function deepEqual(a: unknown, b: unknown, options: DiffOptions): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    if (options.arrayStrategy === 'unordered') {
      const remaining = [...b];
      for (const item of a) {
        const index = remaining.findIndex((candidate) => deepEqual(item, candidate, options));
        if (index === -1) return false;
        remaining.splice(index, 1);
      }
      return true;
    }
    return a.every((item, i) => deepEqual(item, b[i], options));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    // With nullEqualsAbsent, a key holding null is treated as not present.
    const meaningful = (obj: Record<string, unknown>, keys: string[]) =>
      options.nullEqualsAbsent ? keys.filter((k) => obj[k] !== null) : keys;
    const aMeaningful = meaningful(a, aKeys);
    const bMeaningful = meaningful(b, bKeys);
    if (aMeaningful.length !== bMeaningful.length) return false;
    return aMeaningful.every(
      (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key], options),
    );
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (isPlainObject(a) !== isPlainObject(b)) return false;
  return Object.is(normalizeScalar(a, options), normalizeScalar(b, options));
}

// ---------------------------------------------------------------------------
// Array pairing strategies
// ---------------------------------------------------------------------------

interface Pair {
  left: Side;
  right: Side;
  leftIndex?: number;
  rightIndex?: number;
  moved?: boolean;
}

function pairByIndex(left: unknown[], right: unknown[]): Pair[] {
  const pairs: Pair[] = [];
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    pairs.push({
      left: i < left.length ? left[i] : ABSENT,
      right: i < right.length ? right[i] : ABSENT,
      leftIndex: i < left.length ? i : undefined,
      rightIndex: i < right.length ? i : undefined,
    });
  }
  return pairs;
}

/**
 * Match array items by the value of an identity key. Items that are not
 * objects, or that lack the key, fall back to positional matching among
 * themselves so nothing is silently dropped.
 */
function pairByKey(left: unknown[], right: unknown[], key: string): Pair[] {
  const identity = (item: unknown): string | null => {
    if (!isPlainObject(item)) return null;
    const raw = item[key];
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'object') return null;
    return String(raw);
  };

  const rightByIdentity = new Map<string, number[]>();
  right.forEach((item, index) => {
    const id = identity(item);
    if (id === null) return;
    const bucket = rightByIdentity.get(id);
    if (bucket) bucket.push(index);
    else rightByIdentity.set(id, [index]);
  });

  const pairs: Pair[] = [];
  const usedRight = new Set<number>();
  const unkeyedLeft: number[] = [];

  left.forEach((item, index) => {
    const id = identity(item);
    if (id === null) {
      unkeyedLeft.push(index);
      return;
    }
    const bucket = rightByIdentity.get(id);
    const match = bucket?.find((candidate) => !usedRight.has(candidate));
    if (match === undefined) {
      pairs.push({ left: item, right: ABSENT, leftIndex: index });
      return;
    }
    usedRight.add(match);
    pairs.push({
      left: item,
      right: right[match],
      leftIndex: index,
      rightIndex: match,
      moved: index !== match,
    });
  });

  // Positionally pair the leftovers that carried no identity key.
  const unkeyedRight = right
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => !usedRight.has(index) && identity(item) === null)
    .map(({ index }) => index);

  const leftovers = Math.max(unkeyedLeft.length, unkeyedRight.length);
  for (let i = 0; i < leftovers; i++) {
    const l = unkeyedLeft[i];
    const r = unkeyedRight[i];
    if (r !== undefined) usedRight.add(r);
    pairs.push({
      left: l !== undefined ? left[l] : ABSENT,
      right: r !== undefined ? right[r] : ABSENT,
      leftIndex: l,
      rightIndex: r,
    });
  }

  // Anything on the right that never matched is an addition.
  right.forEach((item, index) => {
    if (usedRight.has(index)) return;
    if (identity(item) === null) return; // already handled as a leftover
    pairs.push({ left: ABSENT, right: item, rightIndex: index });
  });

  return pairs;
}

/** Compare arrays as multisets: equal items pair up, the rest are add/remove. */
function pairUnordered(left: unknown[], right: unknown[], options: DiffOptions): Pair[] {
  const pairs: Pair[] = [];
  const usedRight = new Set<number>();

  left.forEach((item, index) => {
    const match = right.findIndex(
      (candidate, i) => !usedRight.has(i) && deepEqual(item, candidate, options),
    );
    if (match === -1) {
      pairs.push({ left: item, right: ABSENT, leftIndex: index });
      return;
    }
    usedRight.add(match);
    pairs.push({
      left: item,
      right: right[match],
      leftIndex: index,
      rightIndex: match,
      moved: index !== match,
    });
  });

  right.forEach((item, index) => {
    if (usedRight.has(index)) return;
    pairs.push({ left: ABSENT, right: item, rightIndex: index });
  });

  return pairs;
}

function pairArrays(left: unknown[], right: unknown[], options: DiffOptions): Pair[] {
  switch (options.arrayStrategy) {
    case 'key':
      return pairByKey(left, right, options.arrayKey);
    case 'unordered':
      return pairUnordered(left, right, options);
    case 'index':
    default:
      return pairByIndex(left, right);
  }
}

// ---------------------------------------------------------------------------
// Diff tree construction
// ---------------------------------------------------------------------------

/** Describe an entire subtree that exists on only one side. */
function describeOneSided(value: unknown, key: string, path: string, status: 'added' | 'removed') {
  const node: DiffNode = {
    key,
    path,
    status,
    leftType: status === 'removed' ? valueType(value) : 'absent',
    rightType: status === 'added' ? valueType(value) : 'absent',
    left: status === 'removed' ? previewValue(value) : undefined,
    right: status === 'added' ? previewValue(value) : undefined,
  };
  if (Array.isArray(value)) {
    node.children = value.map((item, index) =>
      describeOneSided(item, String(index), `${path}/${index}`, status),
    );
  } else if (isPlainObject(value)) {
    node.children = Object.entries(value).map(([childKey, childValue]) =>
      describeOneSided(childValue, childKey, `${path}/${escapePointer(childKey)}`, status),
    );
  }
  return node;
}

function buildNode(
  left: Side,
  right: Side,
  key: string,
  path: string,
  options: DiffOptions,
): DiffNode {
  if (left === ABSENT && right !== ABSENT) return describeOneSided(right, key, path, 'added');
  if (right === ABSENT && left !== ABSENT) return describeOneSided(left, key, path, 'removed');
  if (left === ABSENT && right === ABSENT) {
    return { key, path, status: 'unchanged', leftType: 'absent', rightType: 'absent' };
  }

  const leftType = valueType(left);
  const rightType = valueType(right);
  const base: DiffNode = {
    key,
    path,
    status: 'unchanged',
    leftType,
    rightType,
    left: previewValue(left),
    right: previewValue(right),
  };

  // Both objects — compare by key union, left order first.
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = [...Object.keys(left), ...Object.keys(right).filter((k) => !(k in left))];
    const children = keys.map((childKey) =>
      buildNode(
        Object.prototype.hasOwnProperty.call(left, childKey) ? left[childKey] : ABSENT,
        Object.prototype.hasOwnProperty.call(right, childKey) ? right[childKey] : ABSENT,
        childKey,
        `${path}/${escapePointer(childKey)}`,
        options,
      ),
    );
    return finishContainer(base, collapseNulls(children, options));
  }

  // Both arrays — pair items with the chosen strategy.
  if (Array.isArray(left) && Array.isArray(right)) {
    const pairs = pairArrays(left, right, options);
    const children = pairs.map((pair, position) => {
      const label =
        pair.leftIndex !== undefined ? String(pair.leftIndex) : String(pair.rightIndex ?? position);
      // Paths address the *left* document, which is what a JSON Patch consumer
      // applies against; right-only items are addressed by their right index.
      const childPath = `${path}/${pair.leftIndex ?? pair.rightIndex ?? position}`;
      const node = buildNode(pair.left, pair.right, label, childPath, options);
      node.leftIndex = pair.leftIndex;
      node.rightIndex = pair.rightIndex;
      if (pair.moved) node.moved = true;
      return node;
    });
    return finishContainer(base, children);
  }

  // Mixed container/scalar or differing scalar types.
  if (leftType !== rightType) {
    return { ...base, status: 'changed' };
  }

  return {
    ...base,
    status: deepEqual(left, right, options) ? 'unchanged' : 'changed',
  };
}

/**
 * With `nullEqualsAbsent`, a key that is null on one side and missing on the
 * other is not a difference — drop those children so they do not colour the
 * parent as changed.
 */
function collapseNulls(children: DiffNode[], options: DiffOptions): DiffNode[] {
  if (!options.nullEqualsAbsent) return children;
  return children.map((child) => {
    const nullVsAbsent =
      (child.leftType === 'null' && child.rightType === 'absent') ||
      (child.leftType === 'absent' && child.rightType === 'null');
    return nullVsAbsent ? { ...child, status: 'unchanged' as const } : child;
  });
}

function finishContainer(base: DiffNode, children: DiffNode[]): DiffNode {
  const changed = children.some((child) => child.status !== 'unchanged' || child.moved);
  return { ...base, status: changed ? 'changed' : 'unchanged', children };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function summarize(root: DiffNode): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, unchanged: 0, moved: 0 };

  const visit = (node: DiffNode, isRoot: boolean) => {
    if (!isRoot) {
      if (node.moved) summary.moved += 1;
      // An added or removed subtree counts once, at its top — recursing would
      // inflate the count with every descendant that came along for the ride.
      if (node.status === 'added') {
        summary.added += 1;
        return;
      }
      if (node.status === 'removed') {
        summary.removed += 1;
        return;
      }
      if (!node.children) {
        if (node.status === 'changed') summary.changed += 1;
        else summary.unchanged += 1;
      }
    }
    node.children?.forEach((child) => visit(child, false));
  };

  visit(root, true);
  return summary;
}

// ---------------------------------------------------------------------------
// Patch generation (RFC 6902 / RFC 7386)
// ---------------------------------------------------------------------------

/**
 * Build an RFC 6902 JSON Patch that turns `left` into `right`.
 *
 * Array edits are emitted positionally (replace in place, then append or trim
 * the tail). That is always correct, though not always the shortest possible
 * patch — a minimal move-aware patch is deliberately out of scope, because a
 * wrong-but-short patch is far worse than a long correct one.
 */
export function buildJsonPatch(left: unknown, right: unknown, options: DiffOptions): JsonPatchOp[] {
  const ops: JsonPatchOp[] = [];

  const walk = (a: unknown, b: unknown, path: string) => {
    if (deepEqual(a, b, options)) return;

    if (isPlainObject(a) && isPlainObject(b)) {
      for (const key of Object.keys(a)) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) {
          ops.push({ op: 'remove', path: `${path}/${escapePointer(key)}` });
        }
      }
      for (const key of Object.keys(b)) {
        const childPath = `${path}/${escapePointer(key)}`;
        if (!Object.prototype.hasOwnProperty.call(a, key)) {
          ops.push({ op: 'add', path: childPath, value: b[key] });
        } else {
          walk(a[key], b[key], childPath);
        }
      }
      return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const shared = Math.min(a.length, b.length);
      for (let i = 0; i < shared; i++) walk(a[i], b[i], `${path}/${i}`);
      // Trim from the end so earlier indices stay valid as ops are applied.
      for (let i = a.length - 1; i >= b.length; i--) {
        ops.push({ op: 'remove', path: `${path}/${i}` });
      }
      for (let i = a.length; i < b.length; i++) {
        ops.push({ op: 'add', path: `${path}/-`, value: b[i] });
      }
      return;
    }

    ops.push({ op: 'replace', path, value: b });
  };

  walk(left, right, '');
  return ops;
}

/**
 * Build an RFC 7386 JSON Merge Patch. Merge patches are readable but lossy:
 * arrays are replaced wholesale, and a null in the patch means "delete", so a
 * value that should genuinely become null cannot be expressed.
 */
export function buildMergePatch(left: unknown, right: unknown, options: DiffOptions): unknown {
  if (!isPlainObject(left) || !isPlainObject(right)) return right;

  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(left)) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) patch[key] = null;
  }
  for (const key of Object.keys(right)) {
    if (!Object.prototype.hasOwnProperty.call(left, key)) {
      patch[key] = right[key];
    } else if (!deepEqual(left[key], right[key], options)) {
      patch[key] = buildMergePatch(left[key], right[key], options);
    }
  }
  return patch;
}

function containsArray(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (Array.isArray(value)) return true;
  if (isPlainObject(value)) return Object.values(value).some((v) => containsArray(v, depth + 1));
  return false;
}

function containsNull(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (value === null) return true;
  if (Array.isArray(value)) return value.some((v) => containsNull(v, depth + 1));
  if (isPlainObject(value)) return Object.values(value).some((v) => containsNull(v, depth + 1));
  return false;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Diff two already-parsed values. Callers that start from text should use
 * `diffJson` / `diffYaml` in the engine, which parse first and report parse
 * errors per side.
 */
export function diffValues(
  left: unknown,
  right: unknown,
  options: DiffOptions = DEFAULT_DIFF_OPTIONS,
): DiffResult {
  const root = buildNode(left, right, '', '', options);
  const summary = summarize(root);
  const identical = summary.added === 0 && summary.removed === 0 && summary.changed === 0;

  const warnings: EngineError[] = [];
  const notes: string[] = [];

  if (identical && summary.moved > 0) {
    notes.push(
      `The documents hold the same values, but ${summary.moved} array item${
        summary.moved === 1 ? ' sits' : 's sit'
      } at a different position.`,
    );
  }

  const mergePatch = buildMergePatch(left, right, options);
  if (!identical && (containsArray(left) || containsArray(right))) {
    notes.push(
      'JSON Merge Patch replaces arrays wholesale — use the JSON Patch output for element-level array edits.',
    );
  }
  if (!identical && (containsNull(left) || containsNull(right))) {
    notes.push(
      'A null in a JSON Merge Patch means “remove this key”, so a value that should become null cannot be represented. JSON Patch expresses it exactly.',
    );
  }

  return {
    ok: true,
    root,
    summary,
    identical,
    patch: buildJsonPatch(left, right, options),
    mergePatch,
    errors: [],
    warnings,
    notes: notes.length > 0 ? notes : undefined,
  };
}

/** Flatten a diff tree to the nodes that actually differ, in document order. */
export function flattenChanges(root: DiffNode): DiffNode[] {
  const out: DiffNode[] = [];
  const visit = (node: DiffNode, isRoot: boolean) => {
    if (!isRoot) {
      if (node.status === 'added' || node.status === 'removed') {
        out.push(node);
        return;
      }
      if (node.status === 'changed' && !node.children) out.push(node);
      else if (node.moved) out.push(node);
    }
    node.children?.forEach((child) => visit(child, false));
  };
  visit(root, true);
  return out;
}
