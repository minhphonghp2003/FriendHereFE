"use client";

import { ReactNode, useEffect } from "react";
import { LocationProvider } from "@/providers/location-provider";
import { CallProvider } from "@/providers/call-provider";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { appHub } from "@/lib/signalr/app-hub";
import { locationHub } from "@/lib/signalr";
import { useAppSelector } from "@/store/hooks";
import { V2Header } from "@/components/v2/header/v2-header";
import { V2ToggleNav } from "@/components/v2/nav/v2-toggle-nav";
import { JoinRequestNotifications } from "@/components/chat/join-request-notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface V2LayoutProps {
  children: ReactNode;
}

export default function V2Layout({ children }: V2LayoutProps) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  // v1 (tabs) layout parity: kicked dialog + join-request notifications
  const kicked = useAppSelector((s) => s.location.kicked);

  useEffect(() => {
    if (!isAuthenticated) {
      appHub.stop();
      locationHub.stop();
      router.replace("/init");
    }
  }, [isAuthenticated, router]);

  // When kicked: close every open v2 modal + the nearby sheet — session is over
  useEffect(() => {
    if (kicked) {
      window.dispatchEvent(new Event("v2:close-modals"));
      window.dispatchEvent(new Event("v2:force-close-sheet"));
    }
  }, [kicked]);

  if (!isAuthenticated) return null;

  return (
    <LocationProvider>
      <CallProvider>
        <div className={`v2-app v2-theme ${kicked ? "v2-app-blocked" : ""}`}>
          <V2Header />
          <main className="v2-content">
            {children}
          </main>
          <V2ToggleNav />
        </div>

        {/* Layout-level notifications (same as v1) */}
        <JoinRequestNotifications />
        <Dialog open={kicked} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false} className="v2-kicked-dialog">
            <DialogHeader>
              <DialogTitle>Disconnected</DialogTitle>
              <DialogDescription>
                You were disconnected because you opened the app on another device.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={logout} className="w-full">
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <style jsx global>{`
          html,
          body {
            height: 100%;
            margin: 0;
            padding: 0;
          }

          /* Kicked state: freeze the entire app shell — header, nav button,
             map, sheet all become untouchable. The kicked dialog lives in a
             portal on <body> (outside .v2-app) so it stays fully interactive. */
          .v2-app-blocked {
            pointer-events: none !important;
            filter: grayscale(0.4);
          }

          .v2-app-blocked * {
            pointer-events: none !important;
          }

          /* Kicked dialog must float above EVERYTHING (moments overlay z-70,
             sheets, other dialogs) — it's a blocking, session-ending state */
          .v2-kicked-dialog {
            z-index: 9999 !important;
          }

          /* Its backdrop is a sibling rendered just before the popup in the
             portal — raise it with the next-sibling :has() selector */
          [data-slot="dialog-overlay"]:has(+ .v2-kicked-dialog) {
            z-index: 9998 !important;
          }

          /* Disable pinch/double-tap page zoom (map/image still zoom via their own
             gesture handling). maximumScale=1 in the viewport covers iOS Safari. */
          .v2-app {
            display: flex;
            flex-direction: column;
            height: 100dvh;
            width: 100vw;
            overflow: hidden;
            position: relative;
            background: #000;
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
          }

          /* Prevent iOS auto-zoom when focusing inputs (needs >= 16px font) */
          .v2-app input,
          .v2-app textarea,
          .v2-app select {
            font-size: 16px;
          }

          .v2-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            position: relative;
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .v2-content::-webkit-scrollbar {
            display: none;
          }

          /* Keep pinch-zoom enabled inside map & image surfaces */
          .v2-app .gm-style,
          .v2-app [data-slot="dialog-content"] img,
          .v2-app img.zoomable {
            touch-action: auto;
          }
        `}</style>
      </CallProvider>
    </LocationProvider>
  );
}
