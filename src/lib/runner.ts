import { WORKER_THRESHOLD_BYTES } from './config';
import { runOperation, type EngineOperation, type EngineResponse } from './engine';
import type { WorkerRequest, WorkerResponse } from '@/workers/formatter.worker';

/**
 * Client-side runner that decides between running an operation synchronously on
 * the main thread (small documents) or offloading it to a Web Worker (large
 * documents). Supports cancellation via the returned handle.
 */

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (r: EngineResponse) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/formatter.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, result, error } = event.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (error) entry.reject(new Error(error));
      else if (result) entry.resolve(result);
    };
    worker.onerror = () => {
      // If the worker crashes, reject everything so callers can fall back.
      for (const [, entry] of pending) entry.reject(new Error('The processing worker failed.'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

export interface RunHandle {
  promise: Promise<EngineResponse>;
  cancel: () => void;
  /** True when the work was dispatched to a worker. */
  offloaded: boolean;
}

/**
 * Run an engine operation. Large inputs are sent to the worker; small inputs
 * run inline (avoiding worker round-trip latency). The returned handle can be
 * cancelled — for worker jobs this terminates and recreates the worker.
 */
export function run(op: EngineOperation): RunHandle {
  const size = estimateSize(op);
  const useWorker = size >= WORKER_THRESHOLD_BYTES && getWorker() !== null;

  if (!useWorker) {
    let cancelled = false;
    const promise = new Promise<EngineResponse>((resolve, reject) => {
      // Defer to a microtask so cancellation before execution is possible.
      queueMicrotask(() => {
        if (cancelled) {
          reject(new DOMException('Operation cancelled.', 'AbortError'));
          return;
        }
        try {
          resolve(runOperation(op));
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Operation failed.'));
        }
      });
    });
    return { promise, cancel: () => (cancelled = true), offloaded: false };
  }

  const w = getWorker()!;
  const id = nextId++;
  const promise = new Promise<EngineResponse>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const request: WorkerRequest = { id, operation: op };
    w.postMessage(request);
  });

  return {
    promise,
    offloaded: true,
    cancel: () => {
      const entry = pending.get(id);
      if (entry) {
        pending.delete(id);
        entry.reject(new DOMException('Operation cancelled.', 'AbortError'));
      }
      // Terminate to actually stop in-flight work; it will be recreated lazily.
      worker?.terminate();
      worker = null;
      for (const [, e] of pending) e.reject(new DOMException('Operation cancelled.', 'AbortError'));
      pending.clear();
    },
  };
}

/**
 * Total input size for an operation, across every input it takes. Multi-input
 * operations (schema validation, diff) must count both sides, otherwise a pair
 * of large documents would be compared on the main thread and freeze the UI.
 */
function estimateSize(op: EngineOperation): number {
  if ('source' in op) return op.source.length;
  if ('instance' in op) return op.instance.length + op.schema.length;
  if ('left' in op) return op.left.length + op.right.length;
  return 0;
}
