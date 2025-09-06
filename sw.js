// Service Worker for Digital Signatures Learning Module
const CACHE_NAME = 'digital-signatures-v1.0.0';
const STATIC_CACHE = 'digital-signatures-static-v1.0.0';

// Static assets to cache
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  '/assets/favicon.svg',
  '/assets/logo.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Filter out chrome-extension URLs and unsupported schemes
  if (url.protocol === 'chrome-extension:' ||
      url.protocol === 'file:' ||
      url.protocol === 'data:') {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Handle API requests and other dynamic content
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }

          return fetch(request).then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          });
        })
        .catch((error) => {
          console.error('[SW] Fetch error:', error);
          // Return offline fallback for HTML requests
          if (request.headers.get('accept') &&
              request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        })
    );
  }
});
