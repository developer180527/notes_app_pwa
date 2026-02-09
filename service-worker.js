const CACHE_NAME = 'folio-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event: Cache core assets immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We use addAll to pre-cache critical files.
      // Note: If any of these fail, the service worker install fails.
      return cache.addAll(ASSETS_TO_CACHE);
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
    // This ensures users get the latest version if online, but app works if offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, return cached index.html or the specific page
          return caches.match(event.request).then((response) => {
             return response || caches.match('./index.html');
          });
        })
    );
  } else {
    // Strategy: Cache First, fallback to Network (Stale-While-Revalidate pattern)
    // Good for JS, CSS, Images, Fonts
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // If in cache, return it
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, fetch from network
        return fetch(event.request).then((response) => {
          // Valid response?
          // We allow opaque responses (status 0) for CDNs/no-cors
          if (!response || (response.status !== 200 && response.status !== 0)) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseClone);
          });

          return response;
        });
      })
    );
  }
});