/**
 * Named formatting presets, and encoding of formatting options into a URL.
 *
 * Both exist for the same reason: a team wants one agreed set of formatting
 * options, and wants to switch to it in one click or hand it to a colleague as
 * a link. Presets live in localStorage and never leave the device; the URL form
 * carries *options only* — never document contents.
 */

import { DEFAULT_FORMAT_OPTIONS, type FormatOptions, type IndentStyle } from './types';

export interface Preset {
  name: string;
  options: FormatOptions;
  /** Built-in presets ship with the app and cannot be deleted. */
  builtIn?: boolean;
}

const STORAGE_KEY = 'workbench:presets';
export const MAX_PRESETS = 30;
export const MAX_PRESET_NAME_LENGTH = 40;

export const BUILT_IN_PRESETS: Preset[] = [
  {
    name: 'Default (2-space, LF)',
    builtIn: true,
    options: { ...DEFAULT_FORMAT_OPTIONS },
  },
  {
    name: 'Four-space',
    builtIn: true,
    options: { ...DEFAULT_FORMAT_OPTIONS, indent: 'four-space' },
  },
  {
    name: 'Tabs',
    builtIn: true,
    options: { ...DEFAULT_FORMAT_OPTIONS, indent: 'tab' },
  },
  {
    name: 'Sorted keys',
    builtIn: true,
    options: { ...DEFAULT_FORMAT_OPTIONS, sortKeys: true },
  },
  {
    name: 'Windows (CRLF)',
    builtIn: true,
    options: { ...DEFAULT_FORMAT_OPTIONS, lineEnding: 'crlf' },
  },
];

const INDENT_VALUES: IndentStyle[] = ['two-space', 'four-space', 'tab'];

/** Coerce arbitrary parsed JSON into a valid FormatOptions, field by field. */
export function coerceOptions(raw: unknown, base: FormatOptions = DEFAULT_FORMAT_OPTIONS) {
  const source = (raw ?? {}) as Partial<Record<keyof FormatOptions, unknown>>;
  const options: FormatOptions = { ...base };
  if (INDENT_VALUES.includes(source.indent as IndentStyle)) {
    options.indent = source.indent as IndentStyle;
  }
  if (source.lineEnding === 'lf' || source.lineEnding === 'crlf') {
    options.lineEnding = source.lineEnding;
  }
  if (typeof source.finalNewline === 'boolean') options.finalNewline = source.finalNewline;
  if (typeof source.sortKeys === 'boolean') options.sortKeys = source.sortKeys;
  if (source.yamlVersion === '1.1' || source.yamlVersion === '1.2') {
    options.yamlVersion = source.yamlVersion;
  }
  return options;
}

/** Presets saved by this user, excluding the built-ins. */
export function loadCustomPresets(): Preset[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is { name: unknown; options: unknown } =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as never)['name'] === 'string',
      )
      .slice(0, MAX_PRESETS)
      .map((entry) => ({
        name: String(entry.name).slice(0, MAX_PRESET_NAME_LENGTH),
        options: coerceOptions(entry.options),
      }));
  } catch {
    return [];
  }
}

/** Built-ins followed by the user's own presets. */
export function loadPresets(): Preset[] {
  return [...BUILT_IN_PRESETS, ...loadCustomPresets()];
}

function persist(presets: Preset[]): Preset[] {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(presets.map(({ name, options }) => ({ name, options }))),
    );
  } catch {
    /* storage may be full or disabled; the in-memory list still updates */
  }
  return presets;
}

/**
 * Save (or overwrite) a custom preset. Returns the new custom list. Built-in
 * names are shadowed rather than replaced, so a user can override "Tabs" with
 * their own and still not lose the shipped one if they delete theirs.
 */
export function saveCustomPreset(name: string, options: FormatOptions): Preset[] {
  const trimmed = name.trim().slice(0, MAX_PRESET_NAME_LENGTH);
  if (!trimmed) return loadCustomPresets();
  const existing = loadCustomPresets().filter((preset) => preset.name !== trimmed);
  const next = [...existing, { name: trimmed, options: { ...options } }].slice(-MAX_PRESETS);
  return persist(next);
}

export function deleteCustomPreset(name: string): Preset[] {
  return persist(loadCustomPresets().filter((preset) => preset.name !== name));
}

/** The preset whose options match exactly, if any — used to show the active one. */
export function matchPreset(options: FormatOptions, presets: Preset[]): Preset | undefined {
  return presets.find((preset) => sameOptions(preset.options, options));
}

export function sameOptions(a: FormatOptions, b: FormatOptions): boolean {
  return (
    a.indent === b.indent &&
    a.lineEnding === b.lineEnding &&
    a.finalNewline === b.finalNewline &&
    a.sortKeys === b.sortKeys &&
    (a.yamlVersion ?? '1.2') === (b.yamlVersion ?? '1.2')
  );
}

// ---------------------------------------------------------------------------
// URL encoding — options only, never document contents
// ---------------------------------------------------------------------------

const INDENT_TO_PARAM: Record<IndentStyle, string> = {
  'two-space': '2',
  'four-space': '4',
  tab: 'tab',
};
const PARAM_TO_INDENT: Record<string, IndentStyle> = {
  '2': 'two-space',
  '4': 'four-space',
  tab: 'tab',
};

/**
 * Serialise the options that differ from the defaults. Only the differences are
 * included, so a shared link stays short and readable.
 */
export function optionsToParams(options: FormatOptions): URLSearchParams {
  const params = new URLSearchParams();
  const d = DEFAULT_FORMAT_OPTIONS;
  if (options.indent !== d.indent) params.set('indent', INDENT_TO_PARAM[options.indent]);
  if (options.lineEnding !== d.lineEnding) params.set('eol', options.lineEnding);
  if (options.finalNewline !== d.finalNewline) params.set('nl', options.finalNewline ? '1' : '0');
  if (options.sortKeys !== d.sortKeys) params.set('sort', options.sortKeys ? '1' : '0');
  if ((options.yamlVersion ?? '1.2') !== (d.yamlVersion ?? '1.2')) {
    params.set('yaml', options.yamlVersion ?? '1.2');
  }
  return params;
}

/**
 * Read options from a query string, layered over `base`. Unknown or malformed
 * values are ignored rather than throwing — a hand-edited URL should never
 * break the page.
 */
export function optionsFromParams(
  params: URLSearchParams,
  base: FormatOptions = DEFAULT_FORMAT_OPTIONS,
): FormatOptions {
  const options: FormatOptions = { ...base };

  const indent = params.get('indent');
  if (indent && PARAM_TO_INDENT[indent]) options.indent = PARAM_TO_INDENT[indent];

  const eol = params.get('eol');
  if (eol === 'lf' || eol === 'crlf') options.lineEnding = eol;

  const nl = params.get('nl');
  if (nl === '1' || nl === '0') options.finalNewline = nl === '1';

  const sort = params.get('sort');
  if (sort === '1' || sort === '0') options.sortKeys = sort === '1';

  const yaml = params.get('yaml');
  if (yaml === '1.1' || yaml === '1.2') options.yamlVersion = yaml;

  return options;
}

/** True when the query string carries at least one recognised option. */
export function hasOptionParams(params: URLSearchParams): boolean {
  return ['indent', 'eol', 'nl', 'sort', 'yaml'].some((key) => params.has(key));
}
