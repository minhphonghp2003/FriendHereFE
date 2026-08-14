"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  initOfflineStatus,
  subscribe,
  isOnline as readIsOnline,
  subscribeOutboxChange,
  countOutbox,
  flushOutbox,
} from "@/lib/offline";
import { httpClient } from "@/lib/axios";

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
});

export function useOffline() {
  return useContext(OfflineContext);
}

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);

  // Attach window listeners + subscribe to status changes.
  useEffect(() => {
    const cleanup = initOfflineStatus();
    const unsubscribe = subscribe(setIsOnline);
    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  // Track outbox size.
  useEffect(() => {
    const refresh = () => {
      countOutbox().then(setPendingCount).catch(() => {});
    };
    refresh();
    const unsubscribe = subscribeOutboxChange(refresh);
    return () => unsubscribe();
  }, []);

  // Flush outbox whenever we regain connectivity.
  useEffect(() => {
    if (!isOnline) return;
    flushOutbox(httpClient)
      .then(() => countOutbox())
      .then(setPendingCount)
      .catch(() => {});
  }, [isOnline]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount }}>
      {children}
    </OfflineContext.Provider>
  );
}

// Re-export for convenience.
export { readIsOnline };
