'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production. On finding an updated worker it
 * activates it and reloads once, so users are never stranded on a stale
 * application version.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // A new version is ready; activate it.
              reg.waiting?.postMessage('SKIP_WAITING');
            }
          });
        });
      } catch {
        /* Registration failures are non-fatal; the app still works online. */
      }
    };
    void register();
  }, []);

  return null;
}
