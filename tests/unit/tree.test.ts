import { describe, it, expect } from 'vitest';
import { buildTree, countNodes } from '@/lib/tree';

describe('tree builder', () => {
  it('builds nodes with JSON Pointer paths', () => {
    const tree = buildTree({ a: { b: [1, 2] } });
    expect(tree.type).toBe('object');
    const a = tree.children![0]!;
    expect(a.path).toBe('/a');
    const b = a.children![0]!;
    expect(b.path).toBe('/a/b');
    expect(b.type).toBe('array');
    expect(b.children![0]!.path).toBe('/a/b/0');
  });

  it('escapes special characters in pointer paths', () => {
    const tree = buildTree({ 'a/b': 1, 'c~d': 2 });
    const paths = tree.children!.map((c) => c.path);
    expect(paths).toContain('/a~1b');
    expect(paths).toContain('/c~0d');
  });

  it('counts nodes for virtualization decisions', () => {
    const tree = buildTree({ a: 1, b: [1, 2, 3] });
    // root + a + b + 3 array items = 6
    expect(countNodes(tree)).toBe(6);
  });

  it('produces readable previews', () => {
    const tree = buildTree({ s: 'hi', n: 3, bool: true, nothing: null });
    const previews = Object.fromEntries(tree.children!.map((c) => [c.key, c.preview]));
    expect(previews.s).toBe('"hi"');
    expect(previews.n).toBe('3');
    expect(previews.bool).toBe('true');
    expect(previews.nothing).toBe('null');
  });
});
