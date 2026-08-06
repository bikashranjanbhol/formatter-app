import { describe, it, expect, beforeEach } from 'vitest';
import {
  BUILT_IN_PRESETS,
  coerceOptions,
  deleteCustomPreset,
  hasOptionParams,
  loadCustomPresets,
  loadPresets,
  matchPreset,
  optionsFromParams,
  optionsToParams,
  sameOptions,
  saveCustomPreset,
  MAX_PRESET_NAME_LENGTH,
} from '@/lib/presets';
import { DEFAULT_FORMAT_OPTIONS, type FormatOptions } from '@/lib/types';

const opts = (o: Partial<FormatOptions> = {}): FormatOptions => ({
  ...DEFAULT_FORMAT_OPTIONS,
  ...o,
});

beforeEach(() => {
  localStorage.clear();
});

describe('preset storage', () => {
  it('starts with only the built-ins', () => {
    expect(loadCustomPresets()).toEqual([]);
    expect(loadPresets()).toHaveLength(BUILT_IN_PRESETS.length);
  });

  it('saves and reloads a custom preset', () => {
    saveCustomPreset('Work', opts({ indent: 'four-space', sortKeys: true }));
    const [preset] = loadCustomPresets();
    expect(preset?.name).toBe('Work');
    expect(preset?.options.indent).toBe('four-space');
    expect(preset?.options.sortKeys).toBe(true);
  });

  it('overwrites a preset of the same name instead of duplicating it', () => {
    saveCustomPreset('Work', opts({ indent: 'four-space' }));
    saveCustomPreset('Work', opts({ indent: 'tab' }));
    const presets = loadCustomPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.options.indent).toBe('tab');
  });

  it('trims names and ignores an empty one', () => {
    saveCustomPreset('  Padded  ', opts());
    expect(loadCustomPresets()[0]?.name).toBe('Padded');
    saveCustomPreset('   ', opts());
    expect(loadCustomPresets()).toHaveLength(1);
  });

  it('caps the name length', () => {
    saveCustomPreset('x'.repeat(200), opts());
    expect(loadCustomPresets()[0]?.name).toHaveLength(MAX_PRESET_NAME_LENGTH);
  });

  it('deletes a custom preset', () => {
    saveCustomPreset('A', opts());
    saveCustomPreset('B', opts());
    deleteCustomPreset('A');
    expect(loadCustomPresets().map((p) => p.name)).toEqual(['B']);
  });

  it('lists built-ins before custom presets', () => {
    saveCustomPreset('Mine', opts());
    const presets = loadPresets();
    expect(presets[0]?.builtIn).toBe(true);
    expect(presets.at(-1)?.name).toBe('Mine');
  });

  it('survives corrupt storage without throwing', () => {
    localStorage.setItem('workbench:presets', 'not json');
    expect(loadCustomPresets()).toEqual([]);
    localStorage.setItem('workbench:presets', '{"not":"an array"}');
    expect(loadCustomPresets()).toEqual([]);
    localStorage.setItem('workbench:presets', '[{"no":"name"},null,3]');
    expect(loadCustomPresets()).toEqual([]);
  });

  it('repairs a preset with partially invalid options', () => {
    localStorage.setItem(
      'workbench:presets',
      JSON.stringify([{ name: 'Odd', options: { indent: 'nonsense', sortKeys: 'yes' } }]),
    );
    const [preset] = loadCustomPresets();
    expect(preset?.options).toEqual(DEFAULT_FORMAT_OPTIONS);
  });
});

describe('coerceOptions', () => {
  it('keeps valid fields and drops invalid ones', () => {
    const result = coerceOptions({ indent: 'tab', lineEnding: 'nope', sortKeys: true });
    expect(result.indent).toBe('tab');
    expect(result.lineEnding).toBe(DEFAULT_FORMAT_OPTIONS.lineEnding);
    expect(result.sortKeys).toBe(true);
  });

  it('handles null and non-objects', () => {
    expect(coerceOptions(null)).toEqual(DEFAULT_FORMAT_OPTIONS);
    expect(coerceOptions(42)).toEqual(DEFAULT_FORMAT_OPTIONS);
  });
});

describe('matching', () => {
  it('finds the preset matching the current options', () => {
    const presets = loadPresets();
    expect(matchPreset(opts({ indent: 'tab' }), presets)?.name).toBe('Tabs');
    expect(matchPreset(DEFAULT_FORMAT_OPTIONS, presets)?.name).toBe('Default (2-space, LF)');
  });

  it('returns undefined when nothing matches', () => {
    const custom = opts({ indent: 'tab', sortKeys: true, lineEnding: 'crlf' });
    expect(matchPreset(custom, loadPresets())).toBeUndefined();
  });

  it('treats an omitted yamlVersion as 1.2', () => {
    const withVersion = opts({ yamlVersion: '1.2' });
    const without = { ...opts() };
    delete without.yamlVersion;
    expect(sameOptions(withVersion, without)).toBe(true);
  });
});

describe('URL encoding', () => {
  it('encodes nothing when the options are the defaults', () => {
    expect(optionsToParams(DEFAULT_FORMAT_OPTIONS).toString()).toBe('');
  });

  it('encodes only what differs from the defaults', () => {
    const params = optionsToParams(opts({ indent: 'four-space', sortKeys: true }));
    expect(params.get('indent')).toBe('4');
    expect(params.get('sort')).toBe('1');
    expect(params.has('eol')).toBe(false);
  });

  it('round-trips every option', () => {
    const original = opts({
      indent: 'tab',
      lineEnding: 'crlf',
      finalNewline: false,
      sortKeys: true,
      yamlVersion: '1.1',
    });
    expect(optionsFromParams(optionsToParams(original))).toEqual(original);
  });

  it('ignores unknown and malformed values instead of throwing', () => {
    const params = new URLSearchParams('indent=17&eol=banana&sort=maybe&yaml=9&other=x');
    expect(optionsFromParams(params)).toEqual(DEFAULT_FORMAT_OPTIONS);
  });

  it('layers over a supplied base', () => {
    const base = opts({ indent: 'tab', sortKeys: true });
    const result = optionsFromParams(new URLSearchParams('indent=4'), base);
    expect(result.indent).toBe('four-space');
    expect(result.sortKeys).toBe(true); // untouched by the query string
  });

  it('detects whether a query string carries any option', () => {
    expect(hasOptionParams(new URLSearchParams('indent=4'))).toBe(true);
    expect(hasOptionParams(new URLSearchParams('utm_source=x'))).toBe(false);
    expect(hasOptionParams(new URLSearchParams(''))).toBe(false);
  });

  it('never encodes anything resembling document content', () => {
    const encoded = optionsToParams(opts({ indent: 'tab' })).toString();
    expect(encoded).toBe('indent=tab');
    for (const key of new URLSearchParams(encoded).keys()) {
      expect(['indent', 'eol', 'nl', 'sort', 'yaml']).toContain(key);
    }
  });
});
