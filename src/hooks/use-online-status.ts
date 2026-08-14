"use client";

import { useSyncExternalStore } from "react";
import { isOnline, subscribe } from "@/lib/offline/status";

/**
 * Returns the current online/offline status.
 * Re-renders whenever the browser fires `online` / `offline` events.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    isOnline,
    () => true, // SSR snapshot — assume online during server render.
  );
}
