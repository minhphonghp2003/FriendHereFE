// Basic service worker for PWA support
// Handles app shell caching and offline fallback

const CACHE_NAME = "friendhere-v1";
const OFFLINE_URL = "/init";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (API calls, images, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first strategy for navigation requests, fall back to cache/offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(
          (response) => response ?? caches.match(OFFLINE_URL)
        )
      )
    );
    return;
  }

  // Stale-while-revalidate for other static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached ?? fetchPromise;
    })
  );
});
