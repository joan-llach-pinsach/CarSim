const CACHE_NAME = 'car-sim-v2';

// Use relative paths for GitHub Pages compatibility
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/carModel.js',
  './js/physics.js',
  './js/fileUtils.js',
  './js/tabs/carSpecsTab.js',
  './js/tabs/transmissionTab.js',
  './js/tabs/simulationTab.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// External resources to cache separately (may fail, that's ok)
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Caching app assets');
        // Cache local assets first
        await cache.addAll(ASSETS_TO_CACHE);
        // Try to cache external assets, but don't fail if they're unavailable
        for (const url of EXTERNAL_ASSETS) {
          try {
            await cache.add(url);
          } catch (e) {
            console.log('Could not cache external asset:', url);
          }
        }
      })
      .then(() => {
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache non-GET requests or chrome-extension requests
            if (event.request.method !== 'GET' || 
                event.request.url.startsWith('chrome-extension://')) {
              return networkResponse;
            }
            
            // Clone the response before caching
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // If both cache and network fail, return a fallback for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

