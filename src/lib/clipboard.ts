/**
 * Copy text to the clipboard, returning a result rather than throwing so the
 * UI can show a friendly message on permission failure.
 */
export async function copyToClipboard(text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    }
    // Fallback for insecure contexts / older browsers.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok ? { ok: true } : { ok: false, error: 'Copying is not supported in this browser.' };
  } catch {
    return {
      ok: false,
      error: 'Clipboard permission was denied. You can select the text and copy it manually.',
    };
  }
}
