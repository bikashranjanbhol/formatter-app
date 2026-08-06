'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor } from '../editor/CodeEditor';
import { ErrorList } from '../validation/ErrorList';
import { PrivacyIndicator } from '../privacy/PrivacyIndicator';
import { AdSlot } from '../monetization/AdSlot';
import { DiffView } from './DiffView';
import {
  DiffIcon,
  SwapIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  SampleIcon,
  ClearIcon,
  CancelIcon,
} from '../editor/icons';
import type { EngineError } from '@/lib/types';
import {
  DEFAULT_DIFF_OPTIONS,
  type ArrayStrategy,
  type DiffOptions,
  type DiffResult,
} from '@/lib/diff';
import { run, type RunHandle } from '@/lib/runner';
import { copyToClipboard } from '@/lib/clipboard';
import { readTextFile, downloadText } from '@/lib/files/upload';
import { ACCEPTED_JSON_EXTENSIONS, ACCEPTED_YAML_EXTENSIONS, MAX_FILE_BYTES } from '@/lib/config';
import { computeStats } from '@/lib/text';

const OPTIONS_KEY = 'workbench:diff-options';

type Panel = 'left' | 'right' | 'result';
type PatchFormat = 'json-patch' | 'merge-patch';

export interface DiffWorkbenchProps {
  language: 'json' | 'yaml';
  operationKind: 'diff-json' | 'diff-yaml';
  sampleLeft: string;
  sampleRight: string;
}

export function DiffWorkbench({
  language,
  operationKind,
  sampleLeft,
  sampleRight,
}: DiffWorkbenchProps) {
  const acceptedExtensions = useMemo(
    () => [...(language === 'json' ? ACCEPTED_JSON_EXTENSIONS : ACCEPTED_YAML_EXTENSIONS), '.txt'],
    [language],
  );

  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [errors, setErrors] = useState<EngineError[]>([]);
  const [warnings, setWarnings] = useState<EngineError[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [offloaded, setOffloaded] = useState(false);
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('left');
  const [dragOver, setDragOver] = useState<'left' | 'right' | null>(null);
  const [patchFormat, setPatchFormat] = useState<PatchFormat>('json-patch');
  const [showPatch, setShowPatch] = useState(false);
  const [options, setOptions] = useState<DiffOptions>(DEFAULT_DIFF_OPTIONS);

  const handleRef = useRef<RunHandle | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => setNotice(message), []);

  // Restore comparison preferences (never document contents).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_KEY);
      if (raw) setOptions({ ...DEFAULT_DIFF_OPTIONS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const patchOptions = useCallback((patch: Partial<DiffOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resetResults = useCallback(() => {
    setResult(null);
    setErrors([]);
    setWarnings([]);
    setNotes([]);
  }, []);

  const compare = useCallback(
    async (leftSource: string, rightSource: string, currentOptions: DiffOptions) => {
      if (leftSource.trim().length === 0 || rightSource.trim().length === 0) {
        resetResults();
        setProcessingMs(null);
        return;
      }

      handleRef.current?.cancel();
      const started = performance.now();
      const handle = run({
        kind: operationKind,
        left: leftSource,
        right: rightSource,
        options: currentOptions,
      });
      handleRef.current = handle;
      setBusy(true);
      setOffloaded(handle.offloaded);

      try {
        const response = (await handle.promise) as DiffResult;
        setProcessingMs(performance.now() - started);
        setErrors(response.errors);
        setWarnings(response.warnings);
        setNotes(response.notes ?? []);
        if (response.ok) {
          setResult(response);
          announce(
            response.identical
              ? 'The documents are identical.'
              : `Comparison complete: ${response.summary!.added} added, ${
                  response.summary!.removed
                } removed, ${response.summary!.changed} changed.`,
          );
        } else {
          setResult(null);
          announce(response.errors[0]?.message ?? 'The documents could not be compared.');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          announce('Comparison cancelled.');
        } else {
          const message = err instanceof Error ? err.message : 'Something went wrong.';
          setErrors([{ message, severity: 'error' }]);
          setResult(null);
          announce(message);
        }
      } finally {
        setBusy(false);
        handleRef.current = null;
      }
    },
    [operationKind, resetResults, announce],
  );

  // Re-compare as either side or any option changes, debounced.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void compare(left, right, options), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, options]);

  const swap = useCallback(() => {
    setLeft(right);
    setRight(left);
    announce('Swapped the two documents.');
  }, [left, right, announce]);

  const patchText = useMemo(() => {
    if (!result?.ok) return '';
    return patchFormat === 'json-patch'
      ? JSON.stringify(result.patch ?? [], null, 2)
      : JSON.stringify(result.mergePatch ?? {}, null, 2);
  }, [result, patchFormat]);

  const copyPatch = useCallback(async () => {
    if (!patchText) {
      announce('There is no patch to copy yet.');
      return;
    }
    const res = await copyToClipboard(patchText);
    announce(res.ok ? 'Patch copied to clipboard.' : (res.error ?? 'Copy failed.'));
  }, [patchText, announce]);

  const downloadPatch = useCallback(() => {
    if (!patchText) {
      announce('There is no patch to download yet.');
      return;
    }
    try {
      const name = patchFormat === 'json-patch' ? 'patch.json' : 'merge-patch.json';
      downloadText(patchText, name, 'application/json');
      announce('Download started.');
    } catch {
      announce('Download failed. Your browser may have blocked it.');
    }
  }, [patchText, patchFormat, announce]);

  const handleFile = useCallback(
    async (file: File, side: 'left' | 'right') => {
      const res = await readTextFile(file, acceptedExtensions, MAX_FILE_BYTES);
      if (res.ok && res.content !== undefined) {
        if (side === 'left') setLeft(res.content);
        else setRight(res.content);
        announce(`Loaded ${file.name} into the ${side} document.`);
      } else {
        announce(res.error ?? 'Could not read the file.');
        setErrors([{ message: res.error ?? 'Could not read the file.', severity: 'error' }]);
      }
    },
    [acceptedExtensions, announce],
  );

  const loadSample = useCallback(() => {
    setLeft(sampleLeft);
    setRight(sampleRight);
    announce('Sample documents loaded.');
  }, [sampleLeft, sampleRight, announce]);

  const clearAll = useCallback(() => {
    setLeft('');
    setRight('');
    resetResults();
    setProcessingMs(null);
    announce('Cleared both documents.');
  }, [resetResults, announce]);

  const cancel = useCallback(() => {
    handleRef.current?.cancel();
    setBusy(false);
  }, []);

  const copyFromView = useCallback(
    async (text: string, description: string) => {
      const res = await copyToClipboard(text);
      announce(res.ok ? `Copied ${description}.` : (res.error ?? 'Copy failed.'));
    },
    [announce],
  );

  // Keyboard shortcuts, matching the rest of the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        void compare(left, right, options);
      } else if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        void copyPatch();
      } else if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        downloadPatch();
      } else if (e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        clearAll();
      } else if (e.key === 'Escape' && busy) {
        cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compare, left, right, options, copyPatch, downloadPatch, clearAll, cancel, busy]);

  const leftStats = computeStats(left);
  const rightStats = computeStats(right);

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 py-3">
        <div className="btn-cluster">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void compare(left, right, options)}
            disabled={busy}
          >
            <DiffIcon />
            Compare
            <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[10px] font-medium sm:inline">
              ⌘⏎
            </kbd>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={swap}
            title="Swap the left and right documents"
          >
            <SwapIcon />
            <span className="hidden sm:inline">Swap</span>
          </button>
          {busy && (
            <button
              type="button"
              className="btn border-transparent bg-transparent text-rose-600 shadow-none hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              onClick={cancel}
            >
              <CancelIcon />
              Cancel
            </button>
          )}
        </div>

        <div className="btn-cluster">
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => void copyPatch()}
            title="Copy the patch (⌘⇧C)"
          >
            <CopyIcon />
            <span className="hidden sm:inline">Copy patch</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={downloadPatch}
            title="Download the patch (⌘S)"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={loadSample}
            title="Load two sample documents"
          >
            <SampleIcon />
            <span className="hidden sm:inline">Sample</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={clearAll}
            title="Clear both documents (Alt+K)"
          >
            <ClearIcon />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        <div className="ml-auto">
          <PrivacyIndicator />
        </div>
      </div>

      {/* Comparison options */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <label
            htmlFor="array-strategy"
            className="font-medium text-slate-600 dark:text-slate-300"
          >
            Arrays
          </label>
          <select
            id="array-strategy"
            value={options.arrayStrategy}
            onChange={(e) => patchOptions({ arrayStrategy: e.target.value as ArrayStrategy })}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="index">By position</option>
            <option value="key">By identity key</option>
            <option value="unordered">Ignore order</option>
          </select>
        </div>

        {options.arrayStrategy === 'key' && (
          <div className="flex items-center gap-2">
            <label htmlFor="array-key" className="font-medium text-slate-600 dark:text-slate-300">
              Key
            </label>
            <input
              id="array-key"
              type="text"
              value={options.arrayKey}
              onChange={(e) => patchOptions({ arrayKey: e.target.value })}
              placeholder="id"
              className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        )}

        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={options.ignoreCase}
            onChange={(e) => patchOptions({ ignoreCase: e.target.checked })}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          Ignore case
        </label>
        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={options.trimStrings}
            onChange={(e) => patchOptions({ trimStrings: e.target.checked })}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          Ignore surrounding spaces
        </label>
        <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={options.nullEqualsAbsent}
            onChange={(e) => patchOptions({ nullEqualsAbsent: e.target.checked })}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          null = missing
        </label>
      </div>

      <AdSlot size="leaderboard" className="mb-3" />

      {/* Mobile panel switcher */}
      <div className="mb-2 flex gap-1 lg:hidden" role="tablist" aria-label="Comparison panels">
        {(['left', 'right', 'result'] as Panel[]).map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={panel === name}
            className={`flex-1 rounded-t border-b-2 py-2 text-sm capitalize ${
              panel === name
                ? 'border-brand-600 font-semibold'
                : 'border-transparent text-slate-500'
            }`}
            onClick={() => setPanel(name)}
          >
            {name === 'result' ? 'Differences' : name}
          </button>
        ))}
      </div>

      {/* Editors */}
      <div className="grid gap-3 lg:grid-cols-2">
        <DocumentPanel
          side="left"
          label="Left (original)"
          language={language}
          value={left}
          onChange={setLeft}
          stats={leftStats}
          visible={panel === 'left'}
          dragOver={dragOver === 'left'}
          onDragStateChange={(over) => setDragOver(over ? 'left' : null)}
          onFile={(file) => void handleFile(file, 'left')}
          acceptedExtensions={acceptedExtensions}
        />
        <DocumentPanel
          side="right"
          label="Right (changed)"
          language={language}
          value={right}
          onChange={setRight}
          stats={rightStats}
          visible={panel === 'right'}
          dragOver={dragOver === 'right'}
          onDragStateChange={(over) => setDragOver(over ? 'right' : null)}
          onFile={(file) => void handleFile(file, 'right')}
          acceptedExtensions={acceptedExtensions}
        />
      </div>

      {/* Differences */}
      <section
        className={`card mt-3 flex min-h-[380px] flex-col overflow-hidden ${
          panel === 'result' ? '' : 'hidden'
        } lg:flex`}
        aria-label="Differences"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Differences
          </span>
          {processingMs !== null && (
            <span className="text-[11px] text-slate-400">
              {processingMs.toFixed(0)} ms{offloaded ? ' · background worker' : ''}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Result view">
            <button
              type="button"
              onClick={() => setShowPatch(false)}
              aria-pressed={!showPatch}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                !showPatch
                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tree
            </button>
            <button
              type="button"
              onClick={() => setShowPatch(true)}
              aria-pressed={showPatch}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                showPatch
                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Patch
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          {busy && !result ? (
            <p className="p-6 text-center text-sm text-slate-400" role="status">
              Comparing{offloaded ? ' in a background worker' : ''}…
            </p>
          ) : !result ? (
            <p className="p-6 text-center text-sm text-slate-400">
              Paste or load a document into each side. The comparison runs automatically.
            </p>
          ) : showPatch ? (
            <div className="flex h-full flex-col">
              <div
                className="flex items-center gap-1 border-b border-slate-200/80 px-2 py-1.5 dark:border-slate-800"
                role="group"
                aria-label="Patch format"
              >
                <button
                  type="button"
                  onClick={() => setPatchFormat('json-patch')}
                  aria-pressed={patchFormat === 'json-patch'}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    patchFormat === 'json-patch'
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  JSON Patch (RFC 6902)
                </button>
                <button
                  type="button"
                  onClick={() => setPatchFormat('merge-patch')}
                  aria-pressed={patchFormat === 'merge-patch'}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    patchFormat === 'merge-patch'
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Merge Patch (RFC 7386)
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor
                  value={patchText}
                  language="json"
                  readOnly
                  ariaLabel={
                    patchFormat === 'json-patch' ? 'JSON Patch output' : 'JSON Merge Patch output'
                  }
                />
              </div>
            </div>
          ) : (
            <DiffView
              root={result.root!}
              summary={result.summary!}
              identical={result.identical ?? false}
              onCopy={copyFromView}
            />
          )}
        </div>
      </section>

      {/* Results / warnings */}
      <div className="mt-4">
        <ErrorList errors={errors} warnings={warnings} notes={notes} />
      </div>

      <p className="sr-only" role="status" aria-live="assertive">
        {notice}
      </p>
    </div>
  );
}

interface DocumentPanelProps {
  side: 'left' | 'right';
  label: string;
  language: 'json' | 'yaml';
  value: string;
  onChange: (value: string) => void;
  stats: { lines: number; characters: number; bytes: number };
  visible: boolean;
  dragOver: boolean;
  onDragStateChange: (over: boolean) => void;
  onFile: (file: File) => void;
  acceptedExtensions: string[];
}

function DocumentPanel({
  side,
  label,
  language,
  value,
  onChange,
  stats,
  visible,
  dragOver,
  onDragStateChange,
  onFile,
  acceptedExtensions,
}: DocumentPanelProps) {
  return (
    <section
      className={`card flex min-h-[320px] flex-col overflow-hidden ${visible ? '' : 'hidden'} lg:flex ${
        dragOver ? 'ring-2 ring-brand-500' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragStateChange(true);
      }}
      onDragLeave={() => onDragStateChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragStateChange(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      aria-label={`${label} editor`}
    >
      <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
        <span
          className={`h-2 w-2 rounded-full ${side === 'left' ? 'bg-slate-400' : 'bg-brand-500'}`}
          aria-hidden
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </span>
        <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {language}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="hidden text-[11px] text-slate-400 sm:inline">
            {stats.lines} lines · {stats.bytes} B
          </span>
          <label
            className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title={`Upload a file into the ${side} document`}
          >
            <UploadIcon className="h-3.5 w-3.5" />
            <span className="sr-only">Upload a file into the {side} document</span>
            <input
              type="file"
              className="sr-only"
              accept={acceptedExtensions.join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor
          value={value}
          onChange={onChange}
          language={language}
          ariaLabel={`${label} ${language.toUpperCase()}`}
        />
      </div>
    </section>
  );
}
