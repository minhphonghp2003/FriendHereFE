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

## Device token registration (auth API — pending)

Expected endpoints (BE to implement; FE wiring comes with the auth changes):

```
PUT  /api/notifications/device-tokens/{token}     # register/refresh (idempotent)
DELETE /api/notifications/device-tokens/{token}   # on logout / token invalidation
```

- `PUT` should upsert by `(userId, token)` and store platform info if
  available (e.g. `platform: "web"`).
- FCM may rotate tokens; treat repeated `PUT` of a changed token as a refresh.
- Return `404` (or just 204 silently) on `DELETE` for unknown tokens.
- On send, drop tokens that return `UNREGISTERED` (HTTP 404 from FCM) and
  delete them from the DB.

## Delivery suppression

To avoid double-notifying users with the app open (SignalR connected):

- Track per-user SignalR connection state (`OnConnectedAsync` /
  `OnDisconnectedAsync` on the App hub).
- Only send FCM to users with **zero** live connections — or, if per-device
  granularity is desired later, per-device presence.
- Always send `call.incoming` regardless of connection state **only if** the
  BE can't tell that a connection belongs to the same device; otherwise
  suppress there too (the ringing overlay is in-app).

## Security notes

- Payloads carry no secrets — only ids/names needed to render a notification.
- The JWT stays in `localStorage` (existing convention); push payloads never
  include auth material.
- Authorized via FCM HTTP v1 with a service account
  (`firebase-admin` SDK on the BE recommended).
