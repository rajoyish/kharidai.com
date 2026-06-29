// Minimal Service Worker to satisfy PWA install requirements
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Just pass the request to the network
    // You can implement caching strategies here if needed in the future
});
