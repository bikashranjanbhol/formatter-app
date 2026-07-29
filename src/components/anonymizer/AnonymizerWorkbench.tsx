'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { CodeEditor } from '../editor/CodeEditor';
import { StatusBar, type Validity } from '../editor/StatusBar';
import { ErrorList } from '../validation/ErrorList';
import { PrivacyIndicator } from '../privacy/PrivacyIndicator';
import { AdSlot } from '../monetization/AdSlot';
import {
  FormatIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  SampleIcon,
  ClearIcon,
  CancelIcon,
} from '../editor/icons';
import type { EngineError, IndentStyle } from '@/lib/types';
import type { EngineResult } from '@/lib/types';
import type { AnonymizeScope, AnonymizeStrategy } from '@/lib/json/anonymize';
import { run, type RunHandle } from '@/lib/runner';
import { computeStats } from '@/lib/text';
import { copyToClipboard } from '@/lib/clipboard';
import { readTextFile, downloadText } from '@/lib/files/upload';
import { ACCEPTED_JSON_EXTENSIONS, ACCEPTED_YAML_EXTENSIONS, MAX_FILE_BYTES } from '@/lib/config';

const OPTIONS_KEY = 'workbench:anon-options';

type MobileTab = 'input' | 'output';

export interface AnonymizerWorkbenchProps {
  language: 'json' | 'yaml';
  operationKind: 'anonymize-json' | 'anonymize-yaml';
  sample: string;
}

interface AnonOptions {
  scope: AnonymizeScope;
  keys: string;
  strategy: AnonymizeStrategy;
  indent: IndentStyle;
}

const DEFAULT_OPTIONS: AnonOptions = {
  scope: 'all',
  keys: 'email, name, phone, ssn, address',
  strategy: 'realistic',
  indent: 'two-space',
};

export function AnonymizerWorkbench({ language, operationKind, sample }: AnonymizerWorkbenchProps) {
  const acceptedExtensions =
    language === 'json' ? ACCEPTED_JSON_EXTENSIONS : ACCEPTED_YAML_EXTENSIONS;
  const langLabel = language.toUpperCase();
  const langBadge = language;
  const downloadName = language === 'json' ? 'anonymized.json' : 'anonymized.yaml';
  const downloadMime = language === 'json' ? 'application/json' : 'application/yaml';

  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [errors, setErrors] = useState<EngineError[]>([]);
  const [warnings, setWarnings] = useState<EngineError[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [validity, setValidity] = useState<Validity>('unknown');
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [offloaded, setOffloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('input');
  const [dragOver, setDragOver] = useState(false);
  const [options, setOptions] = useState<AnonOptions>(DEFAULT_OPTIONS);

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const handleRef = useRef<RunHandle | null>(null);

  const stats = useMemo(() => computeStats(input), [input]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_KEY);
      if (raw) setOptions({ ...DEFAULT_OPTIONS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const patch = useCallback((p: Partial<AnonOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(OPTIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const announce = useCallback((m: string) => setNotice(m), []);

  const runAnonymize = useCallback(async () => {
    if (input.trim().length === 0) {
      setErrors([{ message: 'Nothing to anonymize — the input is empty.', severity: 'error' }]);
      setValidity('invalid');
      return;
    }
    handleRef.current?.cancel();
    const started = performance.now();
    const handle = run({
      kind: operationKind,
      source: input,
      options: {
        scope: options.scope,
        keys: options.keys.split(','),
        strategy: options.strategy,
        indent: options.indent,
        lineEnding: 'lf',
        finalNewline: true,
      },
    });
    handleRef.current = handle;
    setBusy(true);
    setOffloaded(handle.offloaded);
    try {
      const result = (await handle.promise) as EngineResult;
      setErrors(result.errors);
      setWarnings(result.warnings);
      setNotes(result.notes ?? []);
      setProcessingMs(performance.now() - started);
      if (result.ok && result.output !== undefined) {
        setOutput(result.output);
        setValidity('valid');
        setMobileTab('output');
        announce('Anonymized. The output is safe to share.');
      } else {
        setOutput('');
        setValidity('invalid');
        announce(`Failed: ${result.errors[0]?.message ?? 'unknown error'}.`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        announce('Operation cancelled.');
      } else {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        setErrors([{ message, severity: 'error' }]);
        setValidity('invalid');
      }
    } finally {
      setBusy(false);
      handleRef.current = null;
    }
  }, [input, options, operationKind, announce]);

  const handleCopy = useCallback(async () => {
    if (!output) {
      announce('There is nothing to copy yet — run Anonymize first.');
      return;
    }
    const res = await copyToClipboard(output);
    announce(res.ok ? 'Copied to clipboard.' : (res.error ?? 'Copy failed.'));
  }, [output, announce]);

  const handleDownload = useCallback(() => {
    if (!output) {
      announce('There is nothing to download yet — run Anonymize first.');
      return;
    }
    try {
      downloadText(output, downloadName, downloadMime);
      announce('Download started.');
    } catch {
      announce('Download failed. Your browser may have blocked it.');
    }
  }, [output, downloadName, downloadMime, announce]);

  const handleFile = useCallback(
    async (file: File) => {
      const res = await readTextFile(file, [...acceptedExtensions, '.txt'], MAX_FILE_BYTES);
      if (res.ok && res.content !== undefined) {
        setInput(res.content);
        announce(`Loaded ${file.name}.`);
        setMobileTab('input');
      } else {
        announce(res.error ?? 'Could not read the file.');
        setErrors([{ message: res.error ?? 'Could not read the file.', severity: 'error' }]);
      }
    },
    [acceptedExtensions, announce],
  );

  const cancel = useCallback(() => {
    handleRef.current?.cancel();
    setBusy(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        void runAnonymize();
      } else if (e.key === 'Escape' && busy) {
        cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runAnonymize, cancel, busy]);

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 py-3">
        <div className="btn-cluster">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runAnonymize()}
            disabled={busy}
          >
            <FormatIcon />
            Anonymize
            <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[10px] font-medium sm:inline">
              ⌘⏎
            </kbd>
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
            onClick={() => void handleCopy()}
            aria-label="Copy output"
          >
            <CopyIcon />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleDownload}
            aria-label="Download output"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Download</span>
          </button>
          <label
            className="btn cursor-pointer border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            title={`Upload a ${langLabel} file`}
          >
            <UploadIcon />
            <span className="hidden sm:inline">Upload</span>
            <span className="sr-only">Upload a {langLabel} file</span>
            <input
              type="file"
              className="sr-only"
              accept={[...acceptedExtensions, '.txt'].join(',')}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setInput(sample);
              announce('Sample loaded.');
              setMobileTab('input');
            }}
            aria-label="Load sample"
          >
            <SampleIcon />
            <span className="hidden sm:inline">Sample</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setInput('');
              setOutput('');
              setErrors([]);
              setWarnings([]);
              setNotes([]);
              setValidity('unknown');
              setProcessingMs(null);
              announce('Cleared.');
            }}
            aria-label="Clear editor"
          >
            <ClearIcon />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        <div className="ml-auto">
          <PrivacyIndicator />
        </div>
      </div>

      {/* Anonymizer settings */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Scope">
          <span className="text-slate-500">Scope</span>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="scope"
              checked={options.scope === 'all'}
              onChange={() => patch({ scope: 'all' })}
            />
            <span>All values</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="scope"
              checked={options.scope === 'keys'}
              onChange={() => patch({ scope: 'keys' })}
            />
            <span>Only these keys</span>
          </label>
        </div>

        {options.scope === 'keys' && (
          <label className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="sr-only">Keys to anonymize</span>
            <input
              type="text"
              value={options.keys}
              onChange={(e) => patch({ keys: e.target.value })}
              placeholder="email, name, ssn, token"
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}

        <label className="flex items-center gap-1.5">
          <span className="text-slate-500">Style</span>
          <select
            className="rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
            value={options.strategy}
            onChange={(e) => patch({ strategy: e.target.value as AnonymizeStrategy })}
          >
            <option value="realistic">Realistic fake</option>
            <option value="redact">Redact (***)</option>
            <option value="type">Type placeholder</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-slate-500">Indent</span>
          <select
            className="rounded border border-slate-300 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
            value={options.indent}
            onChange={(e) => patch({ indent: e.target.value as IndentStyle })}
          >
            <option value="two-space">2 spaces</option>
            <option value="four-space">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
      </div>

      <AdSlot size="leaderboard" className="mb-3" />

      {/* Mobile tabs */}
      <div className="mb-2 flex gap-1 md:hidden" role="tablist" aria-label="Editor panels">
        <button
          role="tab"
          aria-selected={mobileTab === 'input'}
          className={`flex-1 rounded-t border-b-2 py-2 text-sm ${mobileTab === 'input' ? 'border-brand-600 font-semibold' : 'border-transparent text-slate-500'}`}
          onClick={() => setMobileTab('input')}
        >
          Input
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === 'output'}
          className={`flex-1 rounded-t border-b-2 py-2 text-sm ${mobileTab === 'output' ? 'border-brand-600 font-semibold' : 'border-transparent text-slate-500'}`}
          onClick={() => setMobileTab('output')}
        >
          Output
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Input */}
        <section
          className={`card flex min-h-[420px] flex-col overflow-hidden ${mobileTab === 'input' ? '' : 'hidden'} md:flex ${dragOver ? 'ring-2 ring-brand-500' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          aria-label="Input editor"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Input
              </span>
              <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {langBadge}
              </span>
            </div>
            {dragOver && (
              <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                Drop file to load
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor
              value={input}
              onChange={setInput}
              language={language}
              ariaLabel={`${langLabel} input`}
              editorRef={editorRef}
            />
          </div>
        </section>

        {/* Output */}
        <section
          className={`card flex min-h-[420px] flex-col overflow-hidden ${mobileTab === 'output' ? '' : 'hidden'} md:flex`}
          aria-label="Output"
        >
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
            <span
              className={`h-2 w-2 rounded-full ${validity === 'valid' ? 'bg-emerald-500' : validity === 'invalid' ? 'bg-rose-500' : 'bg-slate-400'}`}
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Anonymized output
            </span>
            <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {langBadge}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor value={output} language={language} readOnly ariaLabel="Anonymized output" />
          </div>
        </section>
      </div>

      <StatusBar
        documentType={langLabel}
        validity={validity}
        stats={stats}
        processingMs={processingMs}
        offloaded={offloaded}
      />

      {busy && (
        <p className="mt-2 text-sm text-slate-500" role="status">
          Processing{offloaded ? ' in a background worker' : ''}… press Escape or Cancel to stop.
        </p>
      )}

      <div className="mt-4">
        <ErrorList errors={errors} warnings={warnings} notes={notes} />
      </div>

      <p className="sr-only" role="status" aria-live="assertive">
        {notice}
      </p>
    </div>
  );
}
