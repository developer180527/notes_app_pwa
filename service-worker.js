const CACHE_NAME = 'folio-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Attempt to cache all, but don't fail the entire install if one non-critical file (like index.tsx source) is missing
      // due to build environment differences.
      const results = await Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
      
      // Log failures for debugging but allow installation to proceed
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.debug(`Failed to cache ${ASSETS_TO_CACHE[index]}:`, result.reason);
        }
      });
    })
  );
  self.skipWaiting(); // Activate worker immediately
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});

// Fetch event: Robust handling for offline support
self.addEventListener('fetch', (event) => {
  // Only handle http/https requests
  if (!event.request.url.startsWith('http')) return;

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    // Strategy: Network First, fallback to Cache for HTML/Navigation
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((response) => {
             return response || caches.match('./index.html');
          });
        })
    );
  } else {
    // Strategy: Cache First, fallback to Network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          if (!response || (response.status !== 200 && response.status !== 0)) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseClone);
          });

          return response;
        }).catch(() => {
           // Network failure for static asset, nothing to return.
        });
      })
    );
  }
});