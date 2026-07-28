/// <reference lib="webworker" />
import { runOperation, type EngineOperation, type EngineResponse } from '@/lib/engine';

/**
 * Web Worker entry point. Expensive engine operations run here so the main
 * thread stays responsive on large documents. Each request carries an id so
 * responses can be matched to the correct caller and cancellations honored.
 *
 * IMPORTANT: document contents live only in worker memory during processing.
 * Nothing is persisted or transmitted.
 */

export interface WorkerRequest {
  id: number;
  operation: EngineOperation;
}

export interface WorkerResponse {
  id: number;
  result?: EngineResponse;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, operation } = event.data;
  try {
    const result = runOperation(operation);
    const response: WorkerResponse = { id, result };
    self.postMessage(response);
  } catch (err) {
    // Never echo document contents back in error messages.
    const message =
      err instanceof RangeError || (err instanceof Error && /memory|heap/i.test(err.message))
        ? 'The document is too large to process in this browser tab.'
        : err instanceof Error
          ? err.message
          : 'The worker failed to process this document.';
    const response: WorkerResponse = { id, error: message };
    self.postMessage(response);
  }
};
