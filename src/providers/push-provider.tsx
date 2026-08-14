"use client";

/**
 * PushProvider — wires FCM push notifications to the app lifecycle:
 *
 * 1. On login (auth state present): resolve the FCM token without prompting
 *    (only if permission was already granted) and sync it to the BE.
 * 2. On token rotation (onFcmTokenRefresh): re-sync via
 *    PUT /api/Auth/fcm-token (requires auth → interceptor adds the JWT).
 * 3. Foreground pushes (onForegroundMessage): render in-app toasts; the SW
 *    skips system notifications while the page is visible (see sw.js).
 * 4. On logout: invalidate the local FCM token (BE keeps the last known
 *    token; a fresh login on this device overwrites it anyway).
 *
 * Dev note: the service worker only registers in production, so FCM is
 * effectively production-only on the web (getToken needs the SW).
 */

import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { updateFcmToken } from "@/services/auth";
import {
  deleteFcmToken,
  getFcmToken,
  isFirebaseConfigured,
  onFcmTokenRefresh,
} from "@/lib/fcm";
import { PUSH_TYPE, type PushPayloadData } from "@/types/notification";

const SYNC_DEBOUNCE_MS = 2000;

export function PushProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  // Sync token → BE whenever it (re)appears while authenticated.
  useEffect(() => {
    if (!isAuthenticated || !isFirebaseConfigured()) return;

    let disposed = false;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    const syncToken = (token: string) => {
      if (disposed) return;
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

    const unsubscribe = onFcmTokenRefresh(syncToken);
    return () => {
      disposed = true;
      unsubscribe();
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

  // Invalidate the local token on logout.
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
      const title = isGroup && data.conversationName
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
