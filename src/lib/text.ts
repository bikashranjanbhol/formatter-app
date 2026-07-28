import type { DocumentStats, FormatOptions, IndentStyle, LineEnding } from './types';

/** Return the concrete indentation unit for the requested style. */
export function indentUnit(style: IndentStyle): string {
  switch (style) {
    case 'four-space':
      return '    ';
    case 'tab':
      return '\t';
    case 'two-space':
    default:
      return '  ';
  }
}

/** Return the number of spaces used for an indent style (tabs report as 1). */
export function indentWidth(style: IndentStyle): number {
  switch (style) {
    case 'four-space':
      return 4;
    case 'tab':
      return 1;
    case 'two-space':
    default:
      return 2;
  }
}

export function lineEndingChar(ending: LineEnding): string {
  return ending === 'crlf' ? '\r\n' : '\n';
}

/**
 * Apply the requested line ending and final-newline preferences to already
 * formatted text. Normalizes any mix of CRLF/LF to the target ending first.
 */
export function applyLineEndings(text: string, options: FormatOptions): string {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n+$/g, '');
  const withEnding = options.lineEnding === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized;
  if (options.finalNewline) {
    return withEnding + lineEndingChar(options.lineEnding);
  }
  return withEnding;
}

/** Compute document statistics without mutating the input. */
export function computeStats(text: string): DocumentStats {
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  const characters = text.length;
  // Byte length as UTF-8. TextEncoder is available in browsers and workers.
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(text).length
      : Buffer.byteLength(text, 'utf8');
  return { lines, characters, bytes };
}

/**
 * Convert an absolute character offset into a 1-based line/column pair. Used to
 * translate parser offsets into editor-friendly coordinates.
 */
export function offsetToPosition(text: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < clamped; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line += 1;
      lastNewline = i;
    }
  }
  return { line, column: clamped - lastNewline };
}
