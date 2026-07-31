"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LocationProvider } from "@/providers/location-provider";
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
      <div className="flex min-h-dvh flex-col">
        <main className="flex-1 pb-16">{children}</main>
        <BottomNav />
      </div>
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
    </LocationProvider>
  );
}
