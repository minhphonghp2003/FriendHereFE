"use client";

/**
 * PushProvider — wires FCM push notifications to the app lifecycle
 * (BE contract: docs/fcm-push-notifications.md):
 *
 * 1. Startup: resolve the FCM token and keep it in memory (no prompt —
 *    only when permission was already granted).
 * 2. Login/register: pages attach `fcmToken` to the auth request body.
 * 3. Token rotation + post-grant: sync via PUT /api/Auth/fcm-token
 *    whenever the token changes while authenticated (debounced), and
 *    re-check when the app returns to the foreground.
 * 4. Foreground pushes: the SW forwards payloads via postMessage; chat
 *    renders an in-app toast, calls are handled live by SignalR.
 * 5. Logout: invalidate the local token (next login re-registers it).
 *
 * Dev note: the service worker only registers in production, so FCM is
 * effectively production-only on the web (getToken needs the SW).
 */

import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { updateFcmToken } from "@/services/auth";
import { deleteFcmToken, getFcmToken, isFirebaseConfigured, onFcmTokenRefresh } from "@/lib/fcm";
import { PUSH_TYPE, type PushPayloadData } from "@/types/notification";

const SYNC_DEBOUNCE_MS = 2000;

export function PushProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  // Checklist item 1 — at startup: prime the in-memory token (no prompt).
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    getFcmToken().catch(() => {});
  }, []);

  // Checklist item 3 — sync token → BE on login / rotation / foreground.
  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured()) return;

    let disposed = false;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    const syncToken = (token: string) => {
      if (disposed || !token) return;
      // Debounce: rotation + foreground fetch can both fire in quick succession.
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        updateFcmToken(token).catch((err) => {
          console.warn("[push] Failed to sync FCM token:", err);
        });
      }, SYNC_DEBOUNCE_MS);
    };

    // Fetch token (no prompt) and sync if we have one + auth is present.
    getFcmToken().then(({ token }) => {
      if (token) syncToken(token);
    });

    // onNewToken (rotation) → PUT immediately.
    const unsubscribe = onFcmTokenRefresh(syncToken);

    // App returned to foreground — token may have rotated while hidden
    // (BE doc lists foreground as a PUT trigger).
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        getFcmToken().then(({ token }) => {
          if (token) syncToken(token);
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [isAuthenticated]);

  // Foreground pushes — the SW forwards them here via postMessage when the
  // page is visible (it suppresses the system notification in that case).
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const onSwMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, data } = event.data ?? {};
      if (type === "PUSH_DATA") handleForegroundPush(data);
    };

    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, []);

  // Invalidate the local token on logout (next login re-registers it —
  // BE is single-device-per-user, newest login wins).
  useEffect(() => {
    if (isAuthenticated) return;
    deleteFcmToken().catch(() => {});
  }, [isAuthenticated]);

  return <>{children}</>;
}

function handleForegroundPush(data: PushPayloadData | undefined): void {
  if (!data) return;

  switch (data.type) {
    case PUSH_TYPE.CHAT_MESSAGE: {
      const isGroup = String(data.isGroup ?? "false") === "true";
      const title =
        isGroup && data.conversationName
          ? `${data.senderName} · ${data.conversationName}`
          : data.senderName;
      toast(title, {
        description: data.preview,
        duration: 5000,
      });
      break;
    }
    // Calls are handled live via SignalR while the app is open — the push
    // is redundant in the foreground, so do nothing here.
    case PUSH_TYPE.CALL_INCOMING:
    case PUSH_TYPE.CALL_ENDED:
      break;
  }
}
