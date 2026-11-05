const CACHE_NAME = 'prime-physio-cache-v2';
const CACHE_PREFIX = 'prime-physio-cache-';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/next.svg',
  '/vercel.svg'
];

// Install Event - Pre-cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Only remove caches owned by this app; never touch unrelated origin caches.
          if (cache.startsWith(CACHE_PREFIX) && cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old app cache', cache);
            return caches.delete(cache);
          }
          return Promise.resolve(false);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve cached assets when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Supabase/API calls for sw caching (handled by offlineQueue)
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip next-auth, supabase API, or hot-reloading websockets
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.host.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, then update in background (Stale-While-Revalidate pattern)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignore network update errors when offline */});
          
        return cachedResponse;
      }

      // If not in cache, fetch from network and dynamically cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Cache static files (JS, CSS, images, fonts)
            if (
              url.pathname.includes('/_next/static/') ||
              url.pathname.includes('/fonts/') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.jpg') ||
              url.pathname.endsWith('.svg')
            ) {
              cache.put(event.request, responseToCache);
            }
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline and request is for a page/document, serve the root index page
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        });
    })
  );
});
