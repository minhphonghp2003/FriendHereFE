"use client";

import { Download, X } from "lucide-react";
import { useVersionCheck } from "@/hooks/use-version-check";
import { Button } from "@/components/ui/button";

/**
 * Banner shown when a new version of the app is available
 * Displays at the top of the page and prompts users to update
 */
export function VersionUpdateAlert() {
  const { current, latest, hasUpdate, dismissUpdate } = useVersionCheck();

  if (!hasUpdate || !latest) return null;

  const handleUpdate = () => {
    // In a real PWA, you would trigger service worker update
    // For now, we'll just refresh the page
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    dismissUpdate();
  };

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-[100]">
      <div className="bg-primary text-primary-foreground flex items-center justify-between gap-2 px-4 py-2 text-center text-xs font-medium">
        <div className="flex items-center gap-2">
          <Download className="size-4 shrink-0" />
          <span>
            Phiên bản mới {latest} có sẵn! (Hiện tại: {current})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="h-6 px-3 text-xs" onClick={handleUpdate}>
            Cập nhật
          </Button>
          <button onClick={handleDismiss} className="hover:bg-primary-foreground/20 rounded-sm p-1">
            <X className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
