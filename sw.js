const CACHE_NAME = 'sportsbethelper-v1';
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
];

// Install — cache static shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - App shell (index.html, manifest) → Cache first
// - Odds API / SportsDataIO → Network first, fall back to cache
// - Google Fonts → Cache first
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // App shell → cache first
  if (STATIC_ASSETS.some(a => url.pathname.endsWith(a.replace('/', '')))) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // API calls → network first, stale fallback
  if (url.hostname.includes('api.the-odds-api.com') || url.hostname.includes('api.sportsdata.io')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Google Fonts → cache first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Everything else → network
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
