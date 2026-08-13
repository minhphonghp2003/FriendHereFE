"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LocationProvider } from "@/providers/location-provider";
import { CallProvider } from "@/providers/call-provider";
import { JoinRequestNotifications } from "@/components/chat/join-request-notifications";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { appHub } from "@/lib/signalr/app-hub";
import { locationHub } from "@/lib/signalr";
import { useAppSelector } from "@/store/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const kicked = useAppSelector((s) => s.location.kicked);

  useEffect(() => {
    if (!isAuthenticated) {
      appHub.stop();
      locationHub.stop();
      router.replace("/init");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <LocationProvider>
      <CallProvider>
        <div
          className="flex flex-col ios-fill"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}>
            {children}
          </main>
          <BottomNav />
        </div>
        <JoinRequestNotifications />
        <Dialog open={kicked} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
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
      </CallProvider>
    </LocationProvider>
  );
}
