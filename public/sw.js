const CACHE_NAME = 'prime-physio-cache-v3';
const CACHE_PREFIX = 'prime-physio-cache-';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/next.svg',
  '/vercel.svg'
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're offline | Prime Physio</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:36rem;margin:12vh auto;padding:0 1.25rem;line-height:1.6;color:#172033}
    h1{font-size:1.5rem}p{color:#526078}
  </style>
</head>
<body>
  <h1>You're currently offline</h1>
  <p>Prime Physio couldn't load this page. Check your internet connection and try again.</p>
</body>
</html>`;

function offlineResponse(request) {
  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml) {
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  return new Response('Network unavailable. Please try again when you are online.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// Install Event - Pre-cache core files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches owned by this app.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve(false);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Cache static assets and provide a safe offline fallback.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests. API/auth requests remain network-managed.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.host.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith((async () => {
    try {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        // Return the cached response immediately and refresh it in the background.
        event.waitUntil(
          fetch(request)
            .then(async (networkResponse) => {
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, networkResponse.clone());
              }
            })
            .catch(() => {
              // A failed background refresh must not affect the cached response.
            })
        );

        return cachedResponse;
      }

      const networkResponse = await fetch(request);

      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const isCacheableAsset =
          url.pathname.includes('/_next/static/') ||
          url.pathname.includes('/fonts/') ||
          /\.(png|jpe?g|svg|webp|woff2?)$/i.test(url.pathname);

        if (isCacheableAsset) {
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, networkResponse.clone()))
              .catch(() => {
                // Caching is best-effort; do not fail a successful network response.
              })
          );
        }
      }

      return networkResponse;
    } catch {
      if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        const cachedHome = await caches.match('/');
        if (cachedHome) return cachedHome;
      }

      // Always return a valid Response; caches.match may return undefined.
      return offlineResponse(request);
    }
  })());
});
