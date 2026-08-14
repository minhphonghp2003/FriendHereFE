// Service worker with auto-update support
// Bump CACHE_VERSION when you want to force a full refresh
const CACHE_VERSION = "8";
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
const PRECACHE_ASSETS = ["/loading.mp4", "/loading.webm"];

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
    return;
  }

  // The page asks the SW to close a ringing call notification, e.g. when the
  // app comes to the foreground and the in-app call UI takes over.
  if (event.data && event.data.type === "CLOSE_CALL_NOTIFICATION") {
    const tag = `call-${event.data.callId}`;
    event.waitUntil(
      self.registration.getNotifications({ tag }).then((list) => {
        list.forEach((n) => n.close());
      }),
    );
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

// ---------------------------------------------------------------------------
// Push notifications (FCM data-only messages)
//
// The backend sends FCM Web Push payloads whose `data` block carries the
// payloads defined in src/types/notification.ts and
// docs/fcm-push-notifications.md. There is NO top-level `notification`
// block, so this service worker owns rendering and click routing.
//
// FCM data values are always strings — normalize with String() when used.
// ---------------------------------------------------------------------------

const PUSH_TYPE = {
  CHAT_MESSAGE: "chat.message",
  CALL_INCOMING: "call.incoming",
  CALL_ENDED: "call.ended",
};

const CHAT_TAG_PREFIX = "chat-";
const CALL_TAG_PREFIX = "call-";
// Best-effort auto-dismiss of an unanswered ringing notification. The
// backend should still send `call.ended` — SW timers are not guaranteed
// to fire if the worker is terminated.
const CALL_RING_TIMEOUT_MS = 45000;

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  // FCM web push envelope is { data: {...} }; tolerate bare payloads too.
  const data = payload.data ?? payload;
  const type = String(data.type ?? "");

  switch (type) {
    case PUSH_TYPE.CHAT_MESSAGE:
      event.waitUntil(showChatNotification(data));
      break;
    case PUSH_TYPE.CALL_INCOMING:
      event.waitUntil(showCallNotification(data));
      break;
    case PUSH_TYPE.CALL_ENDED:
      event.waitUntil(dismissCallNotification(data));
      break;
    default:
      // Unknown type — show nothing (silently ignore).
      break;
  }
});

/**
 * chat.message — new chat message.
 * data: { conversationId, messageId, senderId, senderName, senderAvatar?,
 *         messageType, preview, conversationName?, isGroup?, sentAt }
 */
async function showChatNotification(data) {
  const conversationId = String(data.conversationId ?? "");
  const senderName = String(data.senderName ?? "New message");
  const preview = String(data.preview ?? "");
  const isGroup = String(data.isGroup ?? "false") === "true";
  const conversationName = String(data.conversationName ?? "");
  const tag = `${CHAT_TAG_PREFIX}${conversationId}`;

  const title = isGroup && conversationName
    ? `${senderName} · ${conversationName}`
    : senderName;

  // Stack messages per conversation: "hello (3 new)".
  const existing = await self.registration.getNotifications({ tag });
  existing.forEach((n) => n.close());
  const unreadCount = existing.length + 1;
  const body = unreadCount > 1 ? `${preview} (${unreadCount} new)` : preview;

  await self.registration.showNotification(title, {
    body,
    icon: data.senderAvatar ? String(data.senderAvatar) : "/icon-192x192.png",
    badge: "/favicon-32x32.png",
    tag,
    // Re-alert when another message arrives for the same conversation.
    renotify: true,
    data: {
      type: PUSH_TYPE.CHAT_MESSAGE,
      deepLink: `/chat/${conversationId}`,
      conversationId,
    },
  });
}

/**
 * call.incoming — incoming voice/video call.
 * data: { callId, callerUserId, callerName, callerAvatar?, hasVideo, startedAt }
 */
async function showCallNotification(data) {
  const callId = String(data.callId ?? "");
  const callerName = String(data.callerName ?? "Unknown caller");
  const hasVideo = String(data.hasVideo ?? "false") === "true";
  const tag = `${CALL_TAG_PREFIX}${callId}`;

  await self.registration.showNotification(
    `Incoming ${hasVideo ? "video" : "voice"} call`,
    {
      body: `${callerName} is calling…`,
      icon: data.callerAvatar ? String(data.callerAvatar) : "/icon-192x192.png",
      badge: "/favicon-32x32.png",
      tag,
      // Keep on screen until answered/dismissed (desktop; Android ignores).
      requireInteraction: true,
      vibrate: [500, 300, 500],
      data: {
        type: PUSH_TYPE.CALL_INCOMING,
        deepLink: `/home`,
        callId,
      },
    },
  );

  // Best-effort auto-dismiss after the ring window elapses.
  setTimeout(() => {
    self.registration.getNotifications({ tag }).then((list) => {
      list.forEach((n) => n.close());
    });
  }, CALL_RING_TIMEOUT_MS);
}

/**
 * call.ended — the caller hung up / call was answered elsewhere / missed.
 * data: { callId, conversationId?, reason }
 */
async function dismissCallNotification(data) {
  const callId = String(data.callId ?? "");
  const tag = `${CALL_TAG_PREFIX}${callId}`;
  const list = await self.registration.getNotifications({ tag });
  list.forEach((n) => n.close());
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const clickData = event.notification.data ?? {};
  const deepLink =
    typeof clickData.deepLink === "string" && clickData.deepLink
      ? clickData.deepLink
      : null;

  event.waitUntil(
    (async () => {
      // Prefer focusing an already-open window (navigating it to the
      // deep link) over spawning duplicates.
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if ("focus" in client) {
          if (deepLink) {
            try {
              await client.navigate(deepLink);
            } catch {
              // navigate() can reject for cross-origin/hard cases —
              // focusing alone is still better than a new window.
            }
          }
          return client.focus();
        }
      }

      return self.clients.openWindow(deepLink ?? "/init");
    })(),
  );
});
