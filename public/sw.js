const CACHE_NAME = 'prime-physio-cache-v3';
const CACHE_PREFIX = 'prime-physio-cache-';
const ASSETS_TO_CACHE = ['/', '/manifest.json', '/logo.png', '/next.svg', '/vercel.svg'];

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
  if (request.headers.get('accept')?.includes('text/html')) {
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

function isCacheableAsset(url) {
  return url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/fonts/') ||
    /\.(png|jpe?g|svg|webp|woff2?)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames.map((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME
          ? caches.delete(cacheName)
          : Promise.resolve(false))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Leave API, authentication, Supabase, and development HMR requests untouched.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.host.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith((async () => {
    try {
      // Hashed Next.js assets and static files can safely use cache-first.
      if (isCacheableAsset(url)) {
        const cachedAsset = await caches.match(request);
        if (cachedAsset) return cachedAsset;
      }

      const networkResponse = await fetch(request);

      if (
        isCacheableAsset(url) &&
        networkResponse &&
        networkResponse.status === 200 &&
        networkResponse.type === 'basic'
      ) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        } catch {
          // Cache storage is best-effort; preserve the successful network response.
        }
      }

      return networkResponse;
    } catch {
      // Use the cached homepage for offline navigations when available.
      if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        const cachedHome = await caches.match('/');
        if (cachedHome) return cachedHome;
      }

      // Never return undefined: FetchEvent.respondWith requires a Response.
      return offlineResponse(request);
    }
  })());
});
