# FCM Push Notification Contract (Chat + Calls)

This document defines the payloads the backend must send via **FCM HTTP v1**
(`POST https://fcm.googleapis.com/v1/projects/{project}/messages:send`) so the
frontend service worker (`public/sw.js`) can render them.

Types are mirrored in `src/types/notification.ts`.

## General rules

1. **Data-only messages.** Do NOT set a top-level `notification` or
   `webpush.notification` block — the service worker renders notifications
   itself (needed for call ringing UI, message stacking, deep links).
2. **All `data` values must be strings.** FCM rejects non-string values
   (numbers → `"42"`, booleans → `"true"`).
3. **One push per device token, not per topic.** The BE fans out to all
   registered tokens of the recipient user (see device token registration
   below).
4. **Suppress pushes for active SignalR connections** (see
   [Delivery suppression](#delivery-suppression)) to avoid double
   notifications for users with the app open.

### Example envelope (HTTP v1)

```json
{
  "message": {
    "token": "<device-fcm-token>",
    "data": {
      "type": "chat.message",
      "conversationId": "42",
      "messageId": "1337",
      "senderId": "7",
      "senderName": "Phong",
      "senderAvatar": "https://cdn.example.com/a/7.jpg",
      "messageType": "0",
      "preview": "Hello!",
      "conversationName": "Friday night",
      "isGroup": "true",
      "sentAt": "2026-08-14T10:30:00Z"
    },
    "android": { "priority": "high" },
    "apns": { "headers": { "apns-priority": "10" } }
  }
}
```

---

## `chat.message` — new chat message

Sent to every conversation member **except the sender** when a message is
posted and the recipient has no live SignalR connection (or is backgrounded).

| Field | Type (wire) | Required | Notes |
|---|---|---|---|
| `type` | `"chat.message"` | ✔ | Discriminator |
| `conversationId` | string (int) | ✔ | Deep link target `/chat/{id}` |
| `messageId` | string (int) | ✔ | For dedup/logging |
| `senderId` | string (int) | ✔ | |
| `senderName` | string | ✔ | Notification title (1:1) |
| `senderAvatar` | string URL | – | Notification icon |
| `messageType` | string (int) | ✔ | Same enum as chat: `0` Text, `1` File, `2` Emoji, `3` Sticker, `4` System, `5` Gif |
| `preview` | string | ✔ | **BE renders the body text**: message text, or a media label like `📷 Photo`, `📎 attachment.png` |
| `conversationName` | string | – | Group title; include for groups |
| `isGroup` | `"true"`/`"false"` | – | Title becomes `senderName · conversationName` |
| `sentAt` | string ISO 8601 | ✔ | |

**Frontend behavior:** notification tagged `chat-{conversationId}`; consecutive
messages in the same conversation stack (`"hi (3 new)"`); click focuses/navigates
an open window to `/chat/{conversationId}` or opens a new one.

---

## `call.incoming` — incoming voice/video call

Sent to the callee when the caller invokes `AppHub.Call(...)` (ring).

| Field | Type (wire) | Required | Notes |
|---|---|---|---|
| `type` | `"call.incoming"` | ✔ | Discriminator |
| `callId` | string | ✔ | Stable id for the whole call — used to tag the notification and to cancel it later |
| `callerUserId` | string (int) | ✔ | |
| `callerName` | string | ✔ | Shown in body |
| `callerAvatar` | string URL | – | Notification icon |
| `hasVideo` | `"true"`/`"false"` | ✔ | `true` → "Incoming video call" |
| `startedAt` | string ISO 8601 | ✔ | |

**Frontend behavior:** persistent (`requireInteraction`) notification
"⭐ Incoming video call — {callerName} is calling…" rings for 45 s before
auto-dismiss. Click opens/focuses the app (`/home`) — WebRTC signaling then
resumes over SignalR via the normal `ReceiveCall` flow.

> Android note: `requireInteraction` is ignored and the notification is
> dismissible, which is why the 45 s timer + `call.ended` matter.

---

## `call.ended` — dismiss the ringing notification

Sent when the call can no longer be answered: caller cancelled, callee
rejected from another device, call timed out, or was missed.

| Field | Type (wire) | Required | Notes |
|---|---|---|---|
| `type` | `"call.ended"` | ✔ | Discriminator |
| `callId` | string | ✔ | Must match the `callId` sent in `call.incoming` |
| `conversationId` | string (int) | – | Optional convenience |
| `reason` | `"cancelled"` \| `"rejected"` \| `"ended"` \| `"missed"` \| `"timeout"` | ✔ | Reserved for analytics |

**Frontend behavior:** closes the `call-{callId}` notification immediately.

---

## Device token registration (Auth API — implemented)

The FE registers/syncs device tokens through the auth endpoints
(base `/api/Auth`, camelCase JSON, standard envelope):

| When | Call |
|---|---|
| Login (`POST /Auth/login`) | Optional `fcmToken` field in body (sent when permission was already granted) |
| Register (`POST /Auth/register`) | Optional `fcmToken` field in body |
| Token rotation / granted post-login (`PUT /Auth/fcm-token`) ⭐ | `{ "fcmToken": "..." }` with `Authorization: Bearer <jwt>` |
| OAuth callback (`/auth/callback`) | `PUT /Auth/fcm-token` after the JWT is stored |

Behavior notes (from the BE contract):

- Login with a new `fcmToken` **overwrites** the old one (single device per
  user — newest login wins).
- Omitting `fcmToken` on login leaves the stored token unchanged.
- `PUT /fcm-token` errors: `401` missing/invalid JWT · `404` user not found ·
  `400` empty token / > 500 chars.
- FE treats registration as best-effort: failures are logged, never block
  login/chat.

## Delivery suppression

To avoid double-notifying users with the app open (SignalR connected):

- Track per-user SignalR connection state (`OnConnectedAsync` /
  `OnDisconnectedAsync` on the App hub).
- Only send FCM to users with **zero** live connections — or, if per-device
  granularity is desired later, per-device presence.
- With the single-device-per-user model (login overwrites the token), there
  is exactly one target token per user; sending while the user has a live
  App hub connection is redundant for chat. Calls ring in-app via the
  `ReceiveCall` hub event.

## Security notes

- Payloads carry no secrets — only ids/names needed to render a notification.
- The JWT stays in `localStorage` (existing convention); push payloads never
  include auth material.
- Authorized via FCM HTTP v1 with a service account
  (`firebase-admin` SDK on the BE recommended).
