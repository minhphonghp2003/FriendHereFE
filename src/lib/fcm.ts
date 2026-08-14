/**
 * Firebase Cloud Messaging client utilities.
 *
 * - `getFcmToken({ prompt })` resolves the FCM device token. Never prompts
 *   by default; prompting must come from explicit user action.
 * - `onFcmTokenRefresh(cb)` fires when Firebase rotates the token (the
 *   PushProvider syncs it to the BE via PUT /api/Auth/fcm-token).
 * - `deleteFcmToken()` on logout.
 *
 * Foreground pushes arrive via postMessage from the SW (public/sw.js) —
 * the SW intercepts the `push` event before FCM's own onMessage could,
 * so firebase/messaging's onMessage is intentionally unused.
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

/** Token fetched by the most recent successful getFcmToken (memory only). */
let cachedToken: string | null = null;

type TokenListener = (token: string) => void;
const tokenListeners = new Set<TokenListener>();

/**
 * Subscribe to FCM token rotation AND any token change observed through
 * getFcmToken. The PushProvider forwards each rotation to
 * PUT /api/Auth/fcm-token.
 *
 * Note: the web SDK has no onTokenRefresh (native SDKs only) — rotation is
 * detected by re-calling getToken() (PushProvider does this on foreground
 * and auth changes) and comparing against the cached value here.
 */
export function onFcmTokenRefresh(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

function notifyTokenListeners(token: string): void {
  tokenListeners.forEach((listener) => {
    try {
      listener(token);
    } catch (err) {
      console.warn("[fcm] token listener failed:", err);
    }
  });
}

/**
 * Get (or create) the FCM device token for this browser.
 *
 * @param options.prompt When false (default) never shows the browser
 *   permission prompt — returns null while permission is "default". Set
 *   true only from explicit user action (post-login banner/button).
 */
export async function getFcmToken(
  options: { prompt?: boolean; notify?: boolean } = {},
): Promise<FcmTokenResult> {
  const permission = options.prompt
    ? await requestNotificationPermission()
    : typeof Notification !== "undefined"
      ? Notification.permission
      : "denied";
  if (permission !== "granted") return { token: null, permission };

  const messaging = await getFcmMessaging();
  if (!messaging) return { token: null, permission };

  try {
    const sw = await getSwRegistration();
    const token = await getToken(messaging, {
      vapidKey: env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
      serviceWorkerRegistration: sw ?? undefined,
    });
    if (token !== cachedToken) {
      cachedToken = token;
      if (options.notify !== false) notifyTokenListeners(token);
    }
    return { token, permission };
  } catch (err) {
    console.warn("[fcm] Failed to get token:", err);
    return { token: null, permission };
  }
}

/**
 * Return the cached token without touching Firebase — for including in
 * login/register bodies when permission was already granted earlier.
 */
export function getCachedFcmToken(): string | null {
  return cachedToken;
}

/** Invalidate the current FCM token (call on logout). */
export async function deleteFcmToken(): Promise<void> {
  cachedToken = null;
  const messaging = await getFcmMessaging();
  if (!messaging) return;
  try {
    await deleteToken(messaging);
  } catch (err) {
    console.warn("[fcm] Failed to delete token:", err);
  }
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
