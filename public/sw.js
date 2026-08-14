// Service worker with auto-update support
// Bump CACHE_VERSION when you want to force a full refresh
const CACHE_VERSION = "6";
const CACHE_NAME = `friendhere-v${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

// App-shell routes to pre-cache at install so navigation works offline.
const PRECACHE_ROUTES = [
  "/init",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/home",
  "/chat",
  "/moments",
  "/timelines",
  "/settings",
  "/offline",
];

// Static assets to pre-cache (branding + loading video).
const PRECACHE_ASSETS = ["/loading.webm"];

self.addEventListener("install", (event) => {
  const precache = caches
    .open(CACHE_NAME)
    .then((cache) =>
      // Use allSettled so one failed route doesn't break the whole install.
      Promise.allSettled(
        [...PRECACHE_ROUTES, ...PRECACHE_ASSETS].map((route) => cache.add(route)),
      ),
    );
  event.waitUntil(precache);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation requests — ensures users get fresh HTML,
  // falling back to cache then the offline page when unreachable.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then(
              (response) =>
                response ?? caches.match(OFFLINE_URL),
            ),
        ),
    );
    return;
  }

  // Stale-while-revalidate for static assets
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
    }),
  );
});
