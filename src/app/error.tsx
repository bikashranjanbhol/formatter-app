'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary. It intentionally shows a generic message and does
 * NOT render the error's details in the page, since a document-processing error
 * could otherwise surface user content. Errors are only logged to the client
 * console, never to a server.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side console only. No document contents are ever sent anywhere.
    console.error('A client error occurred:', error.name);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="text-4xl" aria-hidden>
        ⚠️
      </div>
      <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        An unexpected error occurred while rendering this page. Your document was not sent anywhere.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
