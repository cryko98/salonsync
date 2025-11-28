
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now to satisfy PWA installability requirements
  // In a real build pipeline, we would precache assets here
  event.respondWith(fetch(event.request));
});
