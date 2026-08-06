import { describe, it, expect } from 'vitest';
import {
  diffValues,
  buildJsonPatch,
  buildMergePatch,
  flattenChanges,
  deepEqual,
  DEFAULT_DIFF_OPTIONS,
  type DiffNode,
  type DiffOptions,
} from '@/lib/diff';
import { runOperation } from '@/lib/engine';
import type { DiffResult } from '@/lib/diff';

const opts = (o: Partial<DiffOptions> = {}): DiffOptions => ({ ...DEFAULT_DIFF_OPTIONS, ...o });

/** Find a node by JSON Pointer path in a diff tree. */
function at(root: DiffNode, path: string): DiffNode | undefined {
  if (root.path === path) return root;
  for (const child of root.children ?? []) {
    const found = at(child, path);
    if (found) return found;
  }
  return undefined;
}

describe('structural diff — objects', () => {
  it('reports identical documents as identical', () => {
    const result = diffValues({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] }, opts());
    expect(result.identical).toBe(true);
    expect(result.summary).toMatchObject({ added: 0, removed: 0, changed: 0 });
    expect(result.patch).toEqual([]);
  });

  it('ignores key order, because JSON objects are unordered', () => {
    const result = diffValues({ a: 1, b: 2 }, { b: 2, a: 1 }, opts());
    expect(result.identical).toBe(true);
  });

  it('detects added, removed, and changed keys', () => {
    const result = diffValues({ a: 1, b: 2 }, { a: 9, c: 3 }, opts());
    expect(result.identical).toBe(false);
    expect(result.summary).toMatchObject({ added: 1, removed: 1, changed: 1 });
    expect(at(result.root!, '/a')?.status).toBe('changed');
    expect(at(result.root!, '/b')?.status).toBe('removed');
    expect(at(result.root!, '/c')?.status).toBe('added');
  });

  it('marks a container as changed when a descendant changed', () => {
    const result = diffValues(
      { outer: { inner: { x: 1 } } },
      { outer: { inner: { x: 2 } } },
      opts(),
    );
    expect(at(result.root!, '/outer')?.status).toBe('changed');
    expect(at(result.root!, '/outer/inner/x')?.status).toBe('changed');
  });

  it('counts an added subtree once, not once per descendant', () => {
    const result = diffValues({}, { added: { a: 1, b: { c: 2, d: 3 } } }, opts());
    expect(result.summary!.added).toBe(1);
  });

  it('treats a type change as a change, not add plus remove', () => {
    const result = diffValues({ a: '1' }, { a: 1 }, opts());
    const node = at(result.root!, '/a')!;
    expect(node.status).toBe('changed');
    expect(node.leftType).toBe('string');
    expect(node.rightType).toBe('number');
  });

  it('escapes JSON Pointer characters in keys', () => {
    const result = diffValues({ 'a/b': 1 }, { 'a/b': 2 }, opts());
    expect(at(result.root!, '/a~1b')?.status).toBe('changed');
    expect(result.patch).toEqual([{ op: 'replace', path: '/a~1b', value: 2 }]);
  });
});

describe('structural diff — arrays', () => {
  it('compares positionally by default', () => {
    const result = diffValues([1, 2, 3], [1, 9, 3], opts());
    expect(at(result.root!, '/1')?.status).toBe('changed');
    expect(result.summary).toMatchObject({ changed: 1, added: 0, removed: 0 });
  });

  it('reports a shorter array as removals at the tail', () => {
    const result = diffValues([1, 2, 3], [1], opts());
    expect(result.summary).toMatchObject({ removed: 2, added: 0 });
  });

  it('reports a longer array as additions at the tail', () => {
    const result = diffValues([1], [1, 2, 3], opts());
    expect(result.summary).toMatchObject({ added: 2, removed: 0 });
  });

  it('an insertion at the head cascades under index matching', () => {
    // This is the honest behaviour of positional comparison, and the reason
    // the "key" strategy exists.
    const result = diffValues([{ id: 'b' }], [{ id: 'a' }, { id: 'b' }], opts());
    expect(result.identical).toBe(false);
    expect(result.summary!.changed + result.summary!.added).toBeGreaterThan(0);
  });

  it('matches array items by identity key so an insertion stays an insertion', () => {
    const left = [{ id: 'b', v: 1 }];
    const right = [
      { id: 'a', v: 0 },
      { id: 'b', v: 1 },
    ];
    const result = diffValues(left, right, opts({ arrayStrategy: 'key', arrayKey: 'id' }));
    expect(result.summary).toMatchObject({ added: 1, removed: 0, changed: 0 });
  });

  it('detects a moved item when matching by key', () => {
    const left = [{ id: 'a' }, { id: 'b' }];
    const right = [{ id: 'b' }, { id: 'a' }];
    const result = diffValues(left, right, opts({ arrayStrategy: 'key', arrayKey: 'id' }));
    expect(result.summary!.moved).toBe(2);
    expect(result.summary!.changed).toBe(0);
    expect(result.notes?.join(' ')).toContain('different position');
  });

  it('detects a field change inside a key-matched item', () => {
    const left = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    const right = [
      { id: 'b', v: 2 },
      { id: 'a', v: 99 },
    ];
    const result = diffValues(left, right, opts({ arrayStrategy: 'key', arrayKey: 'id' }));
    expect(result.summary!.changed).toBe(1);
    expect(result.summary!.added).toBe(0);
    expect(result.summary!.removed).toBe(0);
  });

  it('falls back to positional matching for items without the identity key', () => {
    const result = diffValues(
      [{ id: 'a' }, 'loose'],
      [{ id: 'a' }, 'loose'],
      opts({ arrayStrategy: 'key', arrayKey: 'id' }),
    );
    expect(result.identical).toBe(true);
  });

  it('treats arrays as sets under the unordered strategy', () => {
    const result = diffValues([3, 1, 2], [1, 2, 3], opts({ arrayStrategy: 'unordered' }));
    expect(result.identical).toBe(true);
  });

  it('still reports genuine differences under the unordered strategy', () => {
    const result = diffValues([1, 2], [1, 3], opts({ arrayStrategy: 'unordered' }));
    expect(result.identical).toBe(false);
    expect(result.summary).toMatchObject({ added: 1, removed: 1 });
  });
});

describe('structural diff — comparison options', () => {
  it('can ignore string case', () => {
    expect(diffValues({ a: 'Hello' }, { a: 'hello' }, opts()).identical).toBe(false);
    expect(diffValues({ a: 'Hello' }, { a: 'hello' }, opts({ ignoreCase: true })).identical).toBe(
      true,
    );
  });

  it('can ignore surrounding whitespace in strings', () => {
    expect(diffValues({ a: ' x ' }, { a: 'x' }, opts({ trimStrings: true })).identical).toBe(true);
  });

  it('does not apply string options to non-strings', () => {
    expect(diffValues({ a: 1 }, { a: 2 }, opts({ ignoreCase: true })).identical).toBe(false);
  });

  it('can treat an explicit null as equivalent to a missing key', () => {
    expect(diffValues({ a: null }, {}, opts()).identical).toBe(false);
    expect(diffValues({ a: null }, {}, opts({ nullEqualsAbsent: true })).identical).toBe(true);
  });

  it('distinguishes null from false and from zero', () => {
    expect(diffValues({ a: null }, { a: false }, opts()).identical).toBe(false);
    expect(diffValues({ a: 0 }, { a: false }, opts()).identical).toBe(false);
    expect(diffValues({ a: '' }, { a: null }, opts()).identical).toBe(false);
  });
});

describe('deepEqual', () => {
  it('compares nested structures', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, opts())).toBe(true);
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] }, opts())).toBe(false);
  });

  it('does not confuse an array with an object', () => {
    expect(deepEqual([], {}, opts())).toBe(false);
  });

  it('treats NaN as equal to itself, matching Object.is', () => {
    expect(deepEqual({ a: NaN }, { a: NaN }, opts())).toBe(true);
  });
});

describe('JSON Patch (RFC 6902)', () => {
  it('emits replace for a changed scalar', () => {
    expect(buildJsonPatch({ a: 1 }, { a: 2 }, opts())).toEqual([
      { op: 'replace', path: '/a', value: 2 },
    ]);
  });

  it('emits add and remove for key changes', () => {
    const patch = buildJsonPatch({ a: 1 }, { b: 2 }, opts());
    expect(patch).toContainEqual({ op: 'remove', path: '/a' });
    expect(patch).toContainEqual({ op: 'add', path: '/b', value: 2 });
  });

  it('appends with the "-" token when an array grows', () => {
    expect(buildJsonPatch([1], [1, 2], opts())).toEqual([{ op: 'add', path: '/-', value: 2 }]);
  });

  it('removes array tail entries from the end so indices stay valid', () => {
    expect(buildJsonPatch([1, 2, 3], [1], opts())).toEqual([
      { op: 'remove', path: '/2' },
      { op: 'remove', path: '/1' },
    ]);
  });

  it('replaces the whole document when the root type changes', () => {
    expect(buildJsonPatch({ a: 1 }, [1], opts())).toEqual([
      { op: 'replace', path: '', value: [1] },
    ]);
  });

  it('produces a patch that actually transforms left into right', () => {
    const left = { name: 'Ada', tags: ['x', 'y'], meta: { a: 1, b: 2 } };
    const right = { name: 'Grace', tags: ['x'], meta: { a: 1, c: 3 } };
    const patched = applyPatch(left, buildJsonPatch(left, right, opts()));
    expect(patched).toEqual(right);
  });

  it('produces an applicable patch for array growth and nested edits', () => {
    const left = { items: [{ v: 1 }], flag: true };
    const right = { items: [{ v: 2 }, { v: 3 }], flag: false };
    expect(applyPatch(left, buildJsonPatch(left, right, opts()))).toEqual(right);
  });
});

describe('JSON Merge Patch (RFC 7386)', () => {
  it('nulls out removed keys', () => {
    expect(buildMergePatch({ a: 1, b: 2 }, { a: 1 }, opts())).toEqual({ b: null });
  });

  it('includes only the changed subtree', () => {
    expect(buildMergePatch({ a: { x: 1, y: 2 } }, { a: { x: 9, y: 2 } }, opts())).toEqual({
      a: { x: 9 },
    });
  });

  it('replaces arrays wholesale', () => {
    expect(buildMergePatch({ a: [1, 2] }, { a: [1, 2, 3] }, opts())).toEqual({ a: [1, 2, 3] });
  });

  it('warns that arrays and nulls are not faithfully representable', () => {
    const withArrays = diffValues({ a: [1] }, { a: [2] }, opts());
    expect(withArrays.notes?.join(' ')).toContain('replaces arrays wholesale');

    const withNulls = diffValues({ a: null }, { a: 1 }, opts());
    expect(withNulls.notes?.join(' ')).toContain('remove this key');
  });
});

describe('flattenChanges', () => {
  it('lists only nodes that actually differ', () => {
    const result = diffValues(
      { a: 1, b: 2, c: { d: 3 } },
      { a: 1, b: 9, c: { d: 3 }, e: 4 },
      opts(),
    );
    const paths = flattenChanges(result.root!).map((n) => n.path);
    expect(paths).toEqual(['/b', '/e']);
  });
});

describe('diff through the engine dispatcher', () => {
  it('diffs two JSON documents', () => {
    const result = runOperation({
      kind: 'diff-json',
      left: '{"a":1}',
      right: '{"a":2}',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.ok).toBe(true);
    expect(result.identical).toBe(false);
    expect(result.patch).toEqual([{ op: 'replace', path: '/a', value: 2 }]);
  });

  it('ignores formatting differences between the two documents', () => {
    const result = runOperation({
      kind: 'diff-json',
      left: '{"a":1,"b":2}',
      right: '{\n  "b": 2,\n  "a": 1\n}\n',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.identical).toBe(true);
  });

  it('labels parse errors with the side they came from', () => {
    const result = runOperation({
      kind: 'diff-json',
      left: '{"a":}',
      right: '{"a":1}',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.message).toMatch(/^Left:/);
  });

  it('reports an empty side clearly rather than as a parse failure', () => {
    const result = runOperation({
      kind: 'diff-json',
      left: '{"a":1}',
      right: '   ',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.message).toContain('Right document is empty');
  });

  it('diffs two YAML documents and sees through formatting', () => {
    const result = runOperation({
      kind: 'diff-yaml',
      left: 'a: 1\nb:\n  - x\n',
      right: 'b: [x]\na: 1\n',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.ok).toBe(true);
    expect(result.identical).toBe(true);
  });

  it('detects a real YAML value change', () => {
    const result = runOperation({
      kind: 'diff-yaml',
      left: 'replicas: 3\n',
      right: 'replicas: 5\n',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.identical).toBe(false);
    expect(result.patch).toEqual([{ op: 'replace', path: '/replicas', value: 5 }]);
  });

  it('surfaces YAML parse errors per side', () => {
    const result = runOperation({
      kind: 'diff-yaml',
      left: 'a:\n  b: 1\n   c: 2\n',
      right: 'a: 1\n',
      options: DEFAULT_DIFF_OPTIONS,
    }) as DiffResult;
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.message).toMatch(/^Left:/);
  });
});

// ---------------------------------------------------------------------------
// A minimal RFC 6902 applier, used only to prove generated patches are correct.
// ---------------------------------------------------------------------------

function applyPatch(doc: unknown, ops: { op: string; path: string; value?: unknown }[]): unknown {
  let result = structuredClone(doc);
  for (const op of ops) {
    if (op.path === '') {
      result = structuredClone(op.value);
      continue;
    }
    const tokens = op.path
      .split('/')
      .slice(1)
      .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
    const last = tokens.pop()!;
    let target: any = result;
    for (const token of tokens) target = target[Array.isArray(target) ? Number(token) : token];

    if (Array.isArray(target)) {
      if (op.op === 'add') {
        if (last === '-') target.push(structuredClone(op.value));
        else target.splice(Number(last), 0, structuredClone(op.value));
      } else if (op.op === 'remove') {
        target.splice(Number(last), 1);
      } else {
        target[Number(last)] = structuredClone(op.value);
      }
    } else {
      if (op.op === 'remove') delete target[last];
      else target[last] = structuredClone(op.value);
    }
  }
  return result;
}
