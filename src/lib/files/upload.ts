import { MAX_FILE_BYTES } from '../config';

export interface FileReadResult {
  ok: boolean;
  content?: string;
  error?: string;
  filename?: string;
}

function hasAcceptedExtension(name: string, extensions: string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

/**
 * Read an uploaded file as text after validating its size and extension.
 * Uploaded files are treated as untrusted input: we never execute them, only
 * read their text, and we cap the size to avoid memory exhaustion.
 */
export async function readTextFile(
  file: File,
  acceptedExtensions: string[],
  maxBytes: number = MAX_FILE_BYTES,
): Promise<FileReadResult> {
  if (!hasAcceptedExtension(file.name, acceptedExtensions)) {
    return {
      ok: false,
      error: `Unsupported file type. Accepted extensions: ${acceptedExtensions.join(', ')}.`,
    };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File is too large (${formatBytes(file.size)}). The current limit is ${formatBytes(maxBytes)}.`,
    };
  }
  try {
    const content = await file.text();
    return { ok: true, content, filename: file.name };
  } catch (err) {
    // Never include file contents in the error message.
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not read the file: ${err.message}`
          : 'Could not read the file.',
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Trigger a client-side download of text content. Uses an object URL that is
 * revoked immediately after the download to avoid leaking blobs.
 */
export function downloadText(content: string, filename: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revocation slightly so the browser can start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
