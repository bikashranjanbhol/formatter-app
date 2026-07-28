'use client';

import { useEffect, useRef } from 'react';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl / Cmd + Enter', action: 'Run the primary action (format / convert / validate)' },
  { keys: 'Ctrl / Cmd + Shift + C', action: 'Copy the output' },
  { keys: 'Ctrl / Cmd + S', action: 'Download the output' },
  { keys: 'Ctrl / Cmd + F', action: 'Focus search (tree view)' },
  { keys: 'Alt + K', action: 'Clear the editor' },
  { keys: 'Shift + ?', action: 'Open this help dialog' },
  { keys: 'Escape', action: 'Close dialogs / cancel a running operation' },
];

/** Accessible modal listing keyboard shortcuts, with focus trapping. */
export function HelpDialog({ open, onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="help-title" className="text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            data-autofocus
            aria-label="Close help"
          >
            ✕
          </button>
        </div>
        <dl className="mt-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <dd className="text-slate-600 dark:text-slate-400">{s.action}</dd>
              <dt>
                <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
                  {s.keys}
                </kbd>
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
