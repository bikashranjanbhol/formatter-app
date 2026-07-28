/*
 * Service worker for offline support.
 *
 * Strategy:
 *  - Precache a minimal app shell and the offline fallback.
 *  - Navigations: network-first, falling back to the cached page, then /offline.
 *  - Static assets (_next/static, icons): stale-while-revalidate.
 *
 * Privacy: only same-origin GET requests for application assets and pages are
 * cached. User documents live in memory only and are never passed to the SW,
 * so they cannot be cached here. The cache version is bumped on each deploy so
 * users are never stranded on a stale application version.
 */
const VERSION = 'v1';
const CACHE = `workbench-${VERSION}`;
const APP_SHELL = ['/', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API responses.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline'))),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
