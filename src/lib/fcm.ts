/**
 * Firebase Cloud Messaging client utilities.
 *
 * STATUS: groundwork only — NOT wired into the app yet.
 *
 * The backend auth API changes for FCM token registration are pending; until
 * then nothing here is imported by app code. Intended wiring (once BE ships):
 *
 *   1. <PushProvider> (or reuse the auth provider) calls `initFirebase()`
 *      then `requestNotificationPermission()` → `getFcmToken()` on login.
 *   2. POST the token to the BE endpoint from docs/fcm-push-notifications.md
 *      (PUT /api/notifications/device-tokens/{token}).
 *   3. `onForegroundMessage()` handles messages while the app is focused
 *      (data-only pushes do NOT auto-display in this case).
 *   4. `deleteFcmToken()` on logout so the BE can stop targeting this device.
 *
 * Background handling (app closed/backgrounded) lives entirely in the
 * service worker: public/sw.js — `push` + `notificationclick` events.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { env } from "@/config/env";
import {
  PUSH_TYPE,
  SW_COMMAND,
  type PushPayloadData,
} from "@/types/notification";

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when every required Firebase env var is set. */
export const isFirebaseConfigured = (): boolean =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  );

let messagingInstance: Messaging | null = null;

/** Idempotent Firebase initialization. Returns null when unconfigured. */
export function initFirebase(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** Returns the FCM Messaging instance (null if unsupported/unconfigured). */
export async function getFcmMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (!isFirebaseConfigured()) return null;
  if (!(await isSupported())) return null; // Safari <16.4 etc.
  const app = initFirebase();
  if (!app) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/** Ask the user for Notification permission ("default" → prompt). */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

/** Resolve the SW registration FCM should bind the token to. */
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export interface FcmTokenResult {
  token: string | null;
  /** Permission state when the attempt was made. */
  permission: NotificationPermission;
}

/** Get (or create) the FCM device token for this browser. */
export async function getFcmToken(): Promise<FcmTokenResult> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return { token: null, permission };

  const messaging = await getFcmMessaging();
  if (!messaging) return { token: null, permission };

  try {
    const sw = await getSwRegistration();
    const token = await getToken(messaging, {
      vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: sw ?? undefined,
    });
    return { token, permission };
  } catch (err) {
    console.warn("[fcm] Failed to get token:", err);
    return { token: null, permission };
  }
}

/** Invalidate the current FCM token (call on logout). */
export async function deleteFcmToken(): Promise<void> {
  const messaging = await getFcmMessaging();
  if (!messaging) return;
  try {
    await deleteToken(messaging);
  } catch (err) {
    console.warn("[fcm] Failed to delete token:", err);
  }
}

/**
 * Handle data-only pushes while the app is in the FOREGROUND.
 * The SW never fires for foreground pushes bound via getToken, so the page
 * must render in-app UI (toast) itself.
 */
export function onForegroundMessage(
  handler: (data: PushPayloadData | undefined) => void,
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  getFcmMessaging().then((messaging) => {
    if (!messaging || cancelled) return;
    unsubscribe = onMessage(messaging, (payload) =>
      handler(payload.data as PushPayloadData | undefined),
    );
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/**
 * Tell the SW to close a ringing call notification — e.g. when the app is
 * foregrounded while the in-app call overlay is already showing.
 */
export function closeCallNotification(callId: string): void {
  navigator.serviceWorker?.controller?.postMessage({
    type: SW_COMMAND.CLOSE_CALL_NOTIFICATION,
    callId,
  });
}

/** Narrow unknown FCM data to a known push payload type. */
export function isPushPayloadData(data: unknown): data is PushPayloadData {
  if (!data || typeof data !== "object") return false;
  const type = (data as Record<string, unknown>).type;
  return (
    type === PUSH_TYPE.CHAT_MESSAGE ||
    type === PUSH_TYPE.CALL_INCOMING ||
    type === PUSH_TYPE.CALL_ENDED
  );
}
