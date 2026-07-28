'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { CodeEditor } from '../editor/CodeEditor';
import { StatusBar, type Validity } from '../editor/StatusBar';
import { Toolbar } from '../editor/Toolbar';
import { HelpDialog } from '../editor/HelpDialog';
import { ErrorList } from '../validation/ErrorList';
import { TreeView } from '../tree/TreeView';
import { PrivacyIndicator } from '../privacy/PrivacyIndicator';
import { AdSlot } from '../monetization/AdSlot';
import { resolveConfig } from './config';
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
  const [validity, setValidity] = useState<Validity>('unknown');
  const [processingMs, setProcessingMs] = useState<number | null>(null);
  const [offloaded, setOffloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('input');
  const [dragOver, setDragOver] = useState(false);

  const [options, setOptions] = useState<FormatOptions>(DEFAULT_FORMAT_OPTIONS);

  const editorRef = useRef<ReactCodeMirrorRef | null>(null);
  const handleRef = useRef<RunHandle | null>(null);
  // App-level undo/redo history of the input value.
  const history = useRef<{ stack: string[]; index: number }>({ stack: [''], index: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = useMemo(() => computeStats(input), [input]);

  // Load persisted UI preferences (never document contents).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (raw) setOptions({ ...DEFAULT_FORMAT_OPTIONS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const patchOptions = useCallback((patch: Partial<FormatOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runPrimary()}
          disabled={busy}
        >
          {config.primaryLabel}
          <kbd className="ml-1 hidden text-[10px] opacity-70 sm:inline">⌘⏎</kbd>
        </button>
        {config.secondary === 'minify' && (
          <button
            type="button"
            className="btn"
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
            Minify
          </button>
        )}
        {busy && (
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
        )}
        <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" aria-hidden />
        <button type="button" className="btn" onClick={() => void handleCopy()}>
          Copy
        </button>
        <button type="button" className="btn" onClick={handleDownload}>
          Download
        </button>
        <label className="btn cursor-pointer">
          Upload
          <input
            type="file"
            className="sr-only"
            accept={[...acceptedExtensions, '.txt'].join(',')}
            onChange={handleUploadInput}
          />
        </label>
        <button type="button" className="btn" onClick={loadSample}>
          Sample
        </button>
        <button type="button" className="btn" onClick={clearAll}>
          Clear
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" aria-hidden />
        <button type="button" className="btn" onClick={undo} aria-label="Undo">
          ↶
        </button>
        <button type="button" className="btn" onClick={redo} aria-label="Redo">
          ↷
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setHelpOpen(true)}
          aria-label="Keyboard shortcuts"
        >
          ?
        </button>
        <div className="ml-auto">
          <PrivacyIndicator />
        </div>
      </div>

      {/* Formatting settings */}
      {(config.variant === 'format' || config.variant === 'convert') && (
        <div className="pb-3">
          <Toolbar
            options={options}
            onOptionsChange={patchOptions}
            showYamlVersion={config.showYamlVersion}
            showSortKeys={config.showSortKeys}
          />
        </div>
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
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800">
            <span>Input · {config.inputLanguage.toUpperCase()}</span>
            {dragOver && <span className="text-brand-600">Drop file to load</span>}
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
          <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800">
            {config.variant === 'schema' ? 'Schema (JSON)' : rightPanelLabel}
            {showOutputPanel ? ` · ${config.outputLanguage.toUpperCase()}` : ''}
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
      <div className="mt-4">
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
