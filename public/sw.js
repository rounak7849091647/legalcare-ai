// LegalCareAI Service Worker
// Strategy: Cache-first for static assets, Network-first for API calls

// Bump this whenever caching behaviour changes: 'activate' deletes every cache
// whose name doesn't match, which is what evicts stale entries from old versions.
const CACHE_NAME = 'legalcareai-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Runtime config: deliberately NEVER cached. It carries the backend url and is
// edited after deploy without a rebuild, so a cached copy pins the app to an old
// (often dead) API and surfaces as "Network Error: Could not connect to server"
// with no way for the user to recover short of clearing site data.
const NEVER_CACHE = ['/legalcare-config.js'];

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API calls (let them go direct)
  if (request.method !== 'GET') return;
  if (url.hostname.includes('amazonaws.com') ||
      url.hostname.includes('api.legalcareai.com') ||
      url.hostname.includes('trycloudflare.com') ||
      url.hostname.includes('elasticbeanstalk.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('cognito')) return;

  // Runtime config — always straight from the network, and never stored.
  if (NEVER_CACHE.includes(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // For navigation requests — always network first, fall back to index.html (SPA shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For assets (JS, CSS, images, fonts) — cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
