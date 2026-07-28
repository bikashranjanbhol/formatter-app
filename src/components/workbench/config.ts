import type { ToolMode } from '@/lib/tools';
import { SAMPLE_JSON, SAMPLE_YAML } from '@/lib/samples';

export type WorkbenchVariant = 'format' | 'validate' | 'view' | 'convert' | 'schema';

export interface WorkbenchConfig {
  mode: ToolMode;
  variant: WorkbenchVariant;
  inputLanguage: 'json' | 'yaml';
  outputLanguage: 'json' | 'yaml';
  primaryLabel: string;
  /** Extra secondary action shown as a button, if any. */
  secondary?: 'minify';
  sample: string;
  downloadExtension: string;
  downloadMime: string;
  showSortKeys: boolean;
  showYamlVersion: boolean;
}

export function resolveConfig(mode: ToolMode): WorkbenchConfig {
  return { ...resolveVariant(mode), mode };
}

function resolveVariant(mode: ToolMode): WorkbenchConfig {
  switch (mode) {
    case 'json-formatter':
      return base('json', 'json', 'format', 'Format', {
        secondary: 'minify',
        sample: SAMPLE_JSON,
      });
    case 'json-minifier':
      return base('json', 'json', 'convert', 'Minify', { sample: SAMPLE_JSON });
    case 'json-validator':
      return base('json', 'json', 'validate', 'Validate', {
        sample: SAMPLE_JSON,
        showSortKeys: false,
      });
    case 'json-viewer':
      return base('json', 'json', 'view', 'Build tree', {
        sample: SAMPLE_JSON,
        showSortKeys: false,
      });
    case 'json-to-yaml':
      return base('json', 'yaml', 'convert', 'Convert to YAML', {
        sample: SAMPLE_JSON,
        downloadExtension: 'yaml',
        downloadMime: 'application/yaml',
        showYamlVersion: true,
      });
    case 'yaml-formatter':
      return base('yaml', 'yaml', 'format', 'Format', {
        sample: SAMPLE_YAML,
        downloadExtension: 'yaml',
        downloadMime: 'application/yaml',
        showYamlVersion: true,
      });
    case 'yaml-validator':
      return base('yaml', 'yaml', 'validate', 'Validate', {
        sample: SAMPLE_YAML,
        showSortKeys: false,
        showYamlVersion: true,
        downloadExtension: 'yaml',
        downloadMime: 'application/yaml',
      });
    case 'yaml-to-json':
      return base('yaml', 'json', 'convert', 'Convert to JSON', {
        sample: SAMPLE_YAML,
        showYamlVersion: true,
      });
    case 'json-schema-validator':
      return base('json', 'json', 'schema', 'Validate against schema', {
        sample: SAMPLE_JSON,
        showSortKeys: false,
      });
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function base(
  inputLanguage: 'json' | 'yaml',
  outputLanguage: 'json' | 'yaml',
  variant: WorkbenchVariant,
  primaryLabel: string,
  overrides: Partial<WorkbenchConfig> & { sample: string },
): WorkbenchConfig {
  return {
    mode: 'json-formatter',
    variant,
    inputLanguage,
    outputLanguage,
    primaryLabel,
    downloadExtension: outputLanguage,
    downloadMime: outputLanguage === 'json' ? 'application/json' : 'application/yaml',
    showSortKeys: true,
    showYamlVersion: false,
    ...overrides,
  } as WorkbenchConfig;
}
