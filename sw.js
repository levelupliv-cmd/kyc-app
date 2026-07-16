// sw.js - Service Worker for KYC Simulation App
// Version: 1.0.0
// Cache name with version for easy updates

const CACHE_NAME = 'kyc-sim-v1';
const OFFLINE_URL = '/';

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  // Font Awesome CDN (optional but recommended for offline)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-brands-400.woff2'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Keep current cache and any others we want to preserve
              return name !== CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip cross-origin requests for security (except CDN)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          console.log('[SW] Serving from cache:', request.url);
          return response;
        }

        // Not in cache - fetch from network
        console.log('[SW] Fetching from network:', request.url);
        return fetch(request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response before caching
            const responseToCache = networkResponse.clone();
            
            // Cache the fetched response for future
            caches.open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(request, responseToCache);
                  console.log('[SW] Cached new resource:', request.url);
                } catch (error) {
                  console.warn('[SW] Could not cache resource:', error);
                }
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // If request is for an HTML page, return offline page
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/');
            }
            
            // For other requests, return a simple offline response
            return new Response('Offline - Please check your internet connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  const options = {
    body: event.data?.text() || 'KYC verification ready',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open KYC'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('KYC Simulation', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync (optional - for retrying failed requests)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'kyc-sync') {
    event.waitUntil(
      // Add your sync logic here
      console.log('[SW] Performing background sync')
    );
  }
});

// Handle messages from client
self.addEventListener('message', (event) => {
  console.log('[SW] Message from client:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Log service worker activation
console.log('[SW] Service Worker initialized');
