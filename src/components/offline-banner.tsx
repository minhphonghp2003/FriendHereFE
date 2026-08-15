"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useOffline } from "@/providers/offline-provider";

/**
 * Slim banner shown on every page when the device is offline or when there are
 * pending mutations waiting to sync.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-[100]">
      <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
        {!isOnline ? (
          <>
            <WifiOff className="size-3.5 shrink-0" />
            <span>You&apos;re offline — showing saved data.</span>
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5 shrink-0 animate-spin" />
            <span>
              Syncing {pendingCount} pending change{pendingCount === 1 ? "" : "s"}…
            </span>
          </>
        )}
      </div>
    </div>
  );
}
