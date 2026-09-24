const CACHE_NAME = 'anansi-writer-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Audit SW: AI/API inference traffic must be network-only. No caching credential requests.
    if (url.hostname.includes('openrouter.ai') || url.hostname.includes('chutes.ai') || url.pathname.startsWith('/api')) {
        return; // Bypasses SW entirely to let the browser natively handle the sensitive fetch
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request);
            })
    );
});
