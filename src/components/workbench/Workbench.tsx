'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { CodeEditor } from '../editor/CodeEditor';
import { StatusBar, type Validity } from '../editor/StatusBar';
import { Toolbar } from '../editor/Toolbar';
import { PresetPicker } from '../editor/PresetPicker';
import { HelpDialog } from '../editor/HelpDialog';
import { ErrorList } from '../validation/ErrorList';
import { RepairPanel } from '../validation/RepairPanel';
import { TreeView } from '../tree/TreeView';
import { PrivacyIndicator } from '../privacy/PrivacyIndicator';
import { AdSlot } from '../monetization/AdSlot';
import {
  FormatIcon,
  MinifyIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  SampleIcon,
  ClearIcon,
  UndoIcon,
  RedoIcon,
  HelpIcon,
  CancelIcon,
} from '../editor/icons';
import { resolveConfig } from './config';
import { FormatHint } from './FormatHint';
import { detectFormat } from '@/lib/detect';
import type { ToolMode } from '@/lib/tools';
import {
  DEFAULT_FORMAT_OPTIONS,
  type EngineError,
  type FormatOptions,
  type TreeNode,
} from '@/lib/types';
import type { EngineOperation, EngineResponse, TreeResult, SchemaResult } from '@/lib/engine';
import type { EngineResult } from '@/lib/types';
import { run, type RunHandle } from '@/lib/runner';
import type { RepairResult } from '@/lib/json/repair';
import { coerceOptions, hasOptionParams, optionsFromParams, optionsToParams } from '@/lib/presets';
import { computeStats } from '@/lib/text';
import { copyToClipboard } from '@/lib/clipboard';
import { readTextFile, downloadText } from '@/lib/files/upload';
import { ACCEPTED_JSON_EXTENSIONS, ACCEPTED_YAML_EXTENSIONS, MAX_FILE_BYTES } from '@/lib/config';
import { SAMPLE_SCHEMA } from '@/lib/samples';

const OPTIONS_STORAGE_KEY = 'workbench:options';

type MobileTab = 'input' | 'output';

export function Workbench({ mode }: { mode: ToolMode }) {
  const config = useMemo(() => resolveConfig(mode), [mode]);

  const [input, setInput] = useState('');
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [output, setOutput] = useState('');
  const [tree, setTree] = useState<{ node: TreeNode; count: number } | null>(null);
  const [errors, setErrors] = useState<EngineError[]>([]);
  const [warnings, setWarnings] = useState<EngineError[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [repair, setRepair] = useState<RepairResult | null>(null);
  const [validity, setValidity] = useState<Validity>('unknown');
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [offloaded, setOffloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('input');
  const [dragOver, setDragOver] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  const [options, setOptions] = useState<FormatOptions>(DEFAULT_FORMAT_OPTIONS);

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const handleRef = useRef<RunHandle | null>(null);
  // App-level undo/redo history of the input value.
  const history = useRef<{ stack: string[]; index: number }>({ stack: [''], index: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = useMemo(() => computeStats(input), [input]);

  /**
   * Suggest a different tool when the pasted document clearly is not what this
   * page handles. Only fires on a confident detection, and the suggestion is
   * dismissible — a wrong guess must never get in the way of the editor.
   */
  const detection = useMemo(() => {
    if (input.trim().length < 8) return null;
    const result = detectFormat(input);
    if (result.confidence < 0.75) return null;
    const detectedLanguage =
      result.format === 'json' || result.format === 'json-lines' ? 'json' : result.format;
    return detectedLanguage === config.inputLanguage ? null : result;
  }, [input, config.inputLanguage]);

  // Re-offer the hint whenever the detected format changes.
  useEffect(() => setHintDismissed(false), [detection?.format]);

  // Load persisted UI preferences (never document contents). A query string
  // wins over stored preferences, so a shared settings link opens as its author
  // intended without permanently overwriting the visitor's own defaults until
  // they change something.
  useEffect(() => {
    let stored = DEFAULT_FORMAT_OPTIONS;
    try {
      const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (raw) stored = coerceOptions(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(window.location.search);
    setOptions(hasOptionParams(params) ? optionsFromParams(params, stored) : stored);
  }, []);

  /**
   * Persist the options and mirror them in the URL, so the address bar is
   * always a shareable description of the current settings. Only settings are
   * encoded — document contents never touch the URL.
   */
  const applyOptions = useCallback((next: FormatOptions) => {
    setOptions(next);
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    try {
      const params = optionsToParams(next);
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    } catch {
      /* history may be unavailable; settings still apply */
    }
  }, []);

  const patchOptions = useCallback(
    (patch: Partial<FormatOptions>) => applyOptions({ ...options, ...patch }),
    [options, applyOptions],
  );

  const announce = useCallback((message: string) => {
    setNotice(message);
  }, []);

  const buildOperation = useCallback(
    (source: string): EngineOperation | null => {
      switch (config.mode) {
        case 'json-formatter':
          return { kind: 'format-json', source, options };
        case 'json-minifier':
          return { kind: 'minify-json', source, options };
        case 'json-validator':
          return { kind: 'validate-json', source };
        case 'json-viewer':
          return { kind: 'build-tree', source, sourceKind: 'json' };
        case 'json-to-yaml':
          return { kind: 'json-to-yaml', source, options };
        case 'yaml-formatter':
          return { kind: 'format-yaml', source, options };
        case 'yaml-validator':
          return { kind: 'validate-yaml', source, options };
        case 'yaml-to-json':
          return { kind: 'yaml-to-json', source, options };
        case 'json-schema-validator':
          return {
            kind: 'schema-validate',
            schema,
            instance: source,
            instanceKind: config.inputLanguage,
          };
        default:
          return null;
      }
    },
    [config, options, schema],
  );

  const resetResults = useCallback(() => {
    setOutput('');
    setTree(null);
    setErrors([]);
    setWarnings([]);
    setNotes([]);
    setRepair(null);
  }, []);

  const runPrimary = useCallback(
    async (sourceOverride?: string) => {
      const source = sourceOverride ?? input;
      const op = buildOperation(source);
      if (!op) return;

      // Cancel any in-flight operation first.
      handleRef.current?.cancel();

      const started = performance.now();
      const handle = run(op);
      handleRef.current = handle;
      setBusy(true);
      setOffloaded(handle.offloaded);

      try {
        const result: EngineResponse = await handle.promise;
        applyResult(result);
        setProcessingMs(performance.now() - started);
        // When a JSON document failed to parse, work out whether a known,
        // explainable fix would make it valid — and offer it rather than
        // applying it. Runs through the runner so large inputs stay off the
        // main thread.
        if (!result.ok && config.inputLanguage === 'json') {
          try {
            const suggested = (await run({ kind: 'repair-json', source }).promise) as RepairResult;
            setRepair(suggested.suggestions.length > 0 ? suggested : null);
          } catch {
            setRepair(null);
          }
        } else {
          setRepair(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          announce('Operation cancelled.');
        } else {
          const message = err instanceof Error ? err.message : 'Something went wrong.';
          setErrors([{ message, severity: 'error' }]);
          setValidity('invalid');
          announce(message);
        }
      } finally {
        setBusy(false);
        handleRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, buildOperation],
  );

  const applyResult = useCallback(
    (result: EngineResponse) => {
      // Tree result
      if ('tree' in result || config.variant === 'view') {
        const treeResult = result as TreeResult;
        if (treeResult.ok && treeResult.tree) {
          setTree({ node: treeResult.tree, count: treeResult.nodeCount ?? 0 });
          setErrors([]);
          setWarnings(mapErrors(treeResult.warnings));
          setNotes([]);
          setValidity('valid');
          announce('Tree built successfully.');
          if (treeResult.multiDocument) {
            setNotes(['Multiple YAML documents were combined into a JSON array for the tree.']);
          }
        } else {
          setTree(null);
          setErrors(mapErrors(treeResult.errors));
          setWarnings(mapErrors(treeResult.warnings));
          setValidity('invalid');
          announce('The document could not be parsed.');
        }
        return;
      }

      // Schema result
      if (config.variant === 'schema') {
        const schemaResult = result as SchemaResult;
        setErrors(schemaResult.errors);
        setWarnings(schemaResult.warnings ?? []);
        setNotes(schemaResult.notes ?? []);
        setValidity(schemaResult.ok ? 'valid' : 'invalid');
        announce(
          schemaResult.ok
            ? 'The document is valid against the schema.'
            : schemaResult.schemaInvalid
              ? 'The schema itself is invalid.'
              : `Validation failed with ${schemaResult.errors.length} error(s).`,
        );
        return;
      }

      // Format / validate / convert result
      const engineResult = result as EngineResult;
      setErrors(engineResult.errors);
      setWarnings(engineResult.warnings);
      setNotes(engineResult.notes ?? []);
      if (engineResult.ok) {
        setValidity('valid');
        if (config.variant !== 'validate' && engineResult.output !== undefined) {
          setOutput(engineResult.output);
          setMobileTab('output');
        }
        announce(
          config.variant === 'validate'
            ? 'The document is valid.'
            : `${config.primaryLabel} completed.`,
        );
      } else {
        setValidity('invalid');
        if (config.variant !== 'validate') setOutput('');
        announce(`Failed: ${engineResult.errors[0]?.message ?? 'unknown error'}.`);
      }
    },
    [config, announce],
  );

  // Debounced background validation as the user types.
  useEffect(() => {
    if (input.trim().length === 0) {
      resetResults();
      setValidity('unknown');
      setProcessingMs(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // For view/schema/convert tools we still auto-run so results stay live.
      void runPrimary(input);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, options, schema]);

  // ---- Input + history management ------------------------------------------
  const commitInput = useCallback((value: string, pushHistory = true) => {
    setInput(value);
    if (pushHistory) {
      const h = history.current;
      // Truncate any redo tail and push.
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(value);
      if (h.stack.length > 100) h.stack.shift();
      h.index = h.stack.length - 1;
    }
  }, []);

  const undo = useCallback(() => {
    const h = history.current;
    if (h.index > 0) {
      h.index -= 1;
      setInput(h.stack[h.index] ?? '');
    }
  }, []);
  const redo = useCallback(() => {
    const h = history.current;
    if (h.index < h.stack.length - 1) {
      h.index += 1;
      setInput(h.stack[h.index] ?? '');
    }
  }, []);

  // ---- Actions -------------------------------------------------------------
  const handleCopy = useCallback(async () => {
    const text =
      config.variant === 'validate' || config.variant === 'view' ? input : output || input;
    if (!text) {
      announce('There is nothing to copy yet.');
      return;
    }
    const res = await copyToClipboard(text);
    announce(res.ok ? 'Copied to clipboard.' : (res.error ?? 'Copy failed.'));
  }, [config.variant, input, output, announce]);

  /**
   * Copy a link to this tool with the current settings. The link carries
   * formatting options only — the document is never encoded into it.
   */
  const copySettingsLink = useCallback(async () => {
    const query = optionsToParams(options).toString();
    const url = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
    const res = await copyToClipboard(url);
    announce(
      res.ok
        ? 'Settings link copied. It carries your formatting options only, never your document.'
        : (res.error ?? 'Copy failed.'),
    );
  }, [options, announce]);

  const handleDownload = useCallback(() => {
    const text =
      config.variant === 'validate' || config.variant === 'view' ? input : output || input;
    if (!text) {
      announce('There is nothing to download yet.');
      return;
    }
    try {
      downloadText(text, `output.${config.downloadExtension}`, config.downloadMime);
      announce('Download started.');
    } catch {
      announce('Download failed. Your browser may have blocked it.');
    }
  }, [config, input, output, announce]);

  const acceptedExtensions =
    config.inputLanguage === 'json' ? ACCEPTED_JSON_EXTENSIONS : ACCEPTED_YAML_EXTENSIONS;

  const handleFile = useCallback(
    async (file: File) => {
      const res = await readTextFile(file, [...acceptedExtensions, '.txt'], MAX_FILE_BYTES);
      if (res.ok && res.content !== undefined) {
        commitInput(res.content);
        announce(`Loaded ${file.name}.`);
        setMobileTab('input');
      } else {
        announce(res.error ?? 'Could not read the file.');
        setErrors([{ message: res.error ?? 'Could not read the file.', severity: 'error' }]);
      }
    },
    [acceptedExtensions, commitInput, announce],
  );

  const handleUploadInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const loadSample = useCallback(() => {
    commitInput(config.sample);
    if (config.variant === 'schema') setSchema(SAMPLE_SCHEMA);
    announce('Sample loaded.');
    setMobileTab('input');
  }, [config, commitInput, announce]);

  const clearAll = useCallback(() => {
    commitInput('');
    resetResults();
    setValidity('unknown');
    setProcessingMs(null);
    announce('Cleared.');
  }, [commitInput, resetResults, announce]);

  const cancel = useCallback(() => {
    handleRef.current?.cancel();
    setBusy(false);
  }, []);

  // ---- Keyboard shortcuts --------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        void runPrimary();
      } else if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        void handleCopy();
      } else if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleDownload();
      } else if (e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        clearAll();
      } else if (e.key === '?' && e.shiftKey) {
        // Only when not typing in a field.
        const target = e.target as HTMLElement;
        if (!/^(INPUT|TEXTAREA)$/.test(target.tagName) && !target.isContentEditable) {
          e.preventDefault();
          setHelpOpen(true);
        }
      } else if (e.key === 'Escape' && busy) {
        cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runPrimary, handleCopy, handleDownload, clearAll, cancel, busy]);

  const copyFromTree = useCallback(
    async (text: string, description: string) => {
      const res = await copyToClipboard(text);
      announce(res.ok ? `Copied ${description}.` : (res.error ?? 'Copy failed.'));
    },
    [announce],
  );

  const showOutputPanel = config.variant === 'format' || config.variant === 'convert';
  const showTreePanel = config.variant === 'view';
  const rightPanelLabel = showTreePanel ? 'Tree' : showOutputPanel ? 'Output' : 'Results';

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 py-3">
        {/* Primary + run controls */}
        <div className="btn-cluster">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runPrimary()}
            disabled={busy}
          >
            <FormatIcon />
            {config.primaryLabel}
            <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[10px] font-medium sm:inline">
              ⌘⏎
            </kbd>
          </button>
          {config.secondary === 'minify' && (
            <button
              type="button"
              className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() =>
                void runOnce(
                  { kind: 'minify-json', source: input, options },
                  applyResult,
                  setBusy,
                  setOffloaded,
                  setProcessingMs,
                  handleRef,
                )
              }
              disabled={busy}
            >
              <MinifyIcon />
              Minify
            </button>
          )}
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

        {/* Clipboard + file controls */}
        <div className="btn-cluster">
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => void handleCopy()}
            aria-label="Copy output"
            title="Copy output (⌘⇧C)"
          >
            <CopyIcon />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleDownload}
            aria-label="Download output"
            title="Download output (⌘S)"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Download</span>
          </button>
          <label
            className="btn cursor-pointer border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Upload a file"
          >
            <UploadIcon />
            <span className="hidden sm:inline">Upload</span>
            <span className="sr-only">Upload a file</span>
            <input
              type="file"
              className="sr-only"
              accept={[...acceptedExtensions, '.txt'].join(',')}
              onChange={handleUploadInput}
            />
          </label>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={loadSample}
            aria-label="Load sample"
            title="Load a sample document"
          >
            <SampleIcon />
            <span className="hidden sm:inline">Sample</span>
          </button>
          <button
            type="button"
            className="btn border-transparent bg-transparent shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={clearAll}
            aria-label="Clear editor"
            title="Clear the editor (Alt+K)"
          >
            <ClearIcon />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        {/* History + help controls */}
        <div className="btn-cluster">
          <button type="button" className="btn-ghost" onClick={undo} aria-label="Undo" title="Undo">
            <UndoIcon />
          </button>
          <button type="button" className="btn-ghost" onClick={redo} aria-label="Redo" title="Redo">
            <RedoIcon />
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setHelpOpen(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (Shift + ?)"
          >
            <HelpIcon />
          </button>
        </div>

        <div className="ml-auto">
          <PrivacyIndicator />
        </div>
      </div>

      {/* Formatting settings */}
      {(config.variant === 'format' || config.variant === 'convert') && (
        <div className="mb-3 space-y-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40">
          <Toolbar
            options={options}
            onOptionsChange={patchOptions}
            showYamlVersion={config.showYamlVersion}
            showSortKeys={config.showSortKeys}
          />
          <div className="border-t border-slate-200/70 pt-2 dark:border-slate-800">
            <PresetPicker
              options={options}
              onApply={applyOptions}
              onShare={() => void copySettingsLink()}
              onAnnounce={announce}
            />
          </div>
        </div>
      )}

      {detection && !hintDismissed && (
        <FormatHint
          detection={detection}
          expected={config.inputLanguage}
          onDismiss={() => setHintDismissed(true)}
        />
      )}

      <AdSlot size="leaderboard" className="mb-3" />

      {/* Mobile tab switcher */}
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
          {rightPanelLabel}
        </button>
      </div>

      {/* Editor panels */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Input */}
        <section
          className={`card flex min-h-[420px] flex-col overflow-hidden ${mobileTab === 'input' ? '' : 'hidden'} md:flex ${dragOver ? 'ring-2 ring-brand-500' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          aria-label="Input editor"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Input
              </span>
              <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {config.inputLanguage}
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
              onChange={commitInput}
              language={config.inputLanguage}
              ariaLabel={`${config.inputLanguage.toUpperCase()} input`}
              editorRef={editorRef}
            />
          </div>
        </section>

        {/* Right panel */}
        <section
          className={`card flex min-h-[420px] flex-col overflow-hidden ${mobileTab === 'output' ? '' : 'hidden'} md:flex`}
          aria-label={rightPanelLabel}
        >
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
            <span
              className={`h-2 w-2 rounded-full ${
                validity === 'valid'
                  ? 'bg-emerald-500'
                  : validity === 'invalid'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
              }`}
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {config.variant === 'schema' ? 'Schema' : rightPanelLabel}
            </span>
            {(showOutputPanel || config.variant === 'schema') && (
              <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {config.variant === 'schema' ? 'json' : config.outputLanguage}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            {showTreePanel && tree ? (
              <TreeView root={tree.node} nodeCount={tree.count} onCopy={copyFromTree} />
            ) : config.variant === 'schema' ? (
              <CodeEditor
                value={schema}
                onChange={setSchema}
                language="json"
                ariaLabel="JSON Schema"
              />
            ) : showOutputPanel ? (
              <CodeEditor
                value={output}
                language={config.outputLanguage}
                readOnly
                ariaLabel="Formatted output"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
                {validity === 'valid'
                  ? 'The document is valid.'
                  : validity === 'invalid'
                    ? 'See the errors below.'
                    : 'Results will appear here after you run a check.'}
              </div>
            )}
          </div>
        </section>
      </div>

      <StatusBar
        documentType={config.inputLanguage.toUpperCase()}
        validity={validity}
        stats={stats}
        processingMs={processingMs}
        offloaded={offloaded}
      />

      {/* Busy / progress indicator */}
      {busy && (
        <p className="mt-2 text-sm text-slate-500" role="status">
          Processing{offloaded ? ' in a background worker' : ''}… press Escape or Cancel to stop.
        </p>
      )}

      {/* Results */}
      <div className="mt-4 space-y-2">
        {repair && (
          <RepairPanel
            result={repair}
            onApply={(repaired) => {
              commitInput(repaired);
              setRepair(null);
              announce('Fixes applied to the input.');
            }}
          />
        )}
        <ErrorList
          errors={errors}
          warnings={warnings}
          notes={notes}
          onSelectLocation={(line) => {
            const view = editorRef.current?.view;
            if (!view) return;
            const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines));
            view.dispatch({ selection: { anchor: lineInfo.from }, scrollIntoView: true });
            view.focus();
          }}
        />
      </div>

      {/* Screen-reader announcements */}
      <p className="sr-only" role="status" aria-live="assertive">
        {notice}
      </p>

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// Helper to run a one-off operation (e.g. the secondary Minify button) without
// disturbing the primary flow's memoized callback.
async function runOnce(
  op: EngineOperation,
  applyResult: (r: EngineResponse) => void,
  setBusy: (b: boolean) => void,
  setOffloaded: (b: boolean) => void,
  setProcessingMs: (n: number) => void,
  handleRef: React.MutableRefObject<RunHandle | null>,
) {
  handleRef.current?.cancel();
  const started = performance.now();
  const handle = run(op);
  handleRef.current = handle;
  setBusy(true);
  setOffloaded(handle.offloaded);
  try {
    const result = await handle.promise;
    applyResult(result);
    setProcessingMs(performance.now() - started);
  } catch {
    /* handled by primary path elsewhere */
  } finally {
    setBusy(false);
    handleRef.current = null;
  }
}

function mapErrors(
  errs: { message: string; line?: number; column?: number; severity: 'error' | 'warning' }[],
): EngineError[] {
  return errs.map((e) => ({ ...e }));
}
