/**
 * Central application configuration. The production site URL is read from an
 * environment variable so no fake domain is hardcoded.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

export const SITE_NAME = 'JSON & YAML Workbench';

export const SITE_TAGLINE =
  'Private, schema-aware JSON and YAML tools that run entirely in your browser.';

export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/';

/** Whether advertising placeholders are shown. Hidden in dev unless enabled. */
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADS === 'true';

/**
 * Default client-side upload size limit in bytes. Files larger than this are
 * rejected before any processing. Configurable via env for self-hosting.
 */
export const MAX_FILE_BYTES = Number(process.env.NEXT_PUBLIC_MAX_FILE_BYTES) || 10 * 1024 * 1024;

/**
 * Above this size, expensive operations are offloaded to a Web Worker so the
 * main thread (and thus the UI) stays responsive.
 */
export const WORKER_THRESHOLD_BYTES = 256 * 1024;

export const ACCEPTED_JSON_EXTENSIONS = ['.json'];
export const ACCEPTED_YAML_EXTENSIONS = ['.yaml', '.yml'];
export const ACCEPTED_ALL_EXTENSIONS = [
  ...ACCEPTED_JSON_EXTENSIONS,
  ...ACCEPTED_YAML_EXTENSIONS,
  '.txt',
];
