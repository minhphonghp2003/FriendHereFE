/**
 * FCM push notification payload contract (shared with the backend).
 *
 * All notifications are sent as FCM **data-only** messages (HTTP v1 API):
 * the service worker (public/sw.js) receives the decrypted Web Push payload
 * and renders the notification itself. The backend must NOT set a top-level
 * `notification` block (or `webpush.notification`) for these types.
 *
 * IMPORTANT: FCM `data` values must be strings. All numeric/boolean fields
 * below are serialized as strings over the wire (e.g. `conversationId: "42"`,
 * `isGroup: "true"`). The service worker normalizes them via String().
 *
 * Full contract: docs/fcm-push-notifications.md
 */

export const PUSH_TYPE = {
  /** New chat message → deep link /chat/{conversationId} */
  CHAT_MESSAGE: "chat.message",
  /** Incoming voice/video call → opens the app */
  CALL_INCOMING: "call.incoming",
  /** Call finished/cancelled → dismisses the ringing notification */
  CALL_ENDED: "call.ended",
} as const;

export type PushType = (typeof PUSH_TYPE)[keyof typeof PUSH_TYPE];

export interface ChatMessagePushData {
  type: typeof PUSH_TYPE.CHAT_MESSAGE;
  /** Target conversation — deep link /chat/{conversationId} */
  conversationId: number | string;
  /** Message id — used for logging/dedup */
  messageId: number | string;
  senderId: number | string;
  senderName: string;
  /** Absolute URL of the sender's avatar (optional) */
  senderAvatar?: string | null;
  /** Same enum as chat: 0 Text, 1 File, 2 Emoji, 3 Sticker, 4 System, 5 Gif */
  messageType: number | string;
  /** Pre-rendered body, e.g. the text or "📷 Photo" (BE renders media labels) */
  preview: string;
  /** Group title — omit for 1:1 chats */
  conversationName?: string | null;
  /** true when the conversation is a group */
  isGroup?: boolean | string;
  /** ISO 8601 timestamp */
  sentAt: string;
}

export interface CallIncomingPushData {
  type: typeof PUSH_TYPE.CALL_INCOMING;
  /** Unique call id — used to tag/cancel the ringing notification */
  callId: string;
  callerUserId: number | string;
  callerName: string;
  /** Absolute URL of the caller's avatar (optional) */
  callerAvatar?: string | null;
  /** true for video call, false for voice-only */
  hasVideo: boolean | string;
  /** ISO 8601 timestamp */
  startedAt: string;
}

export type CallEndedReason = "cancelled" | "rejected" | "ended" | "missed" | "timeout";

export interface CallEndedPushData {
  type: typeof PUSH_TYPE.CALL_ENDED;
  callId: string;
  conversationId?: number | string;
  reason: CallEndedReason;
}

export type PushPayloadData = ChatMessagePushData | CallIncomingPushData | CallEndedPushData;

/** Message posted by the SW to a window client when a notification is clicked */
export const SW_MESSAGE = {
  NOTIFICATION_CLICK: "PUSH_NOTIFICATION_CLICK",
} as const;

/** Message the page can post to the SW */
export const SW_COMMAND = {
  CLOSE_CALL_NOTIFICATION: "CLOSE_CALL_NOTIFICATION",
} as const;
