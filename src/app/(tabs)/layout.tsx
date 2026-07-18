"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { LocationProvider } from "@/providers/location-provider";
import { BottomNav } from "@/components/mobile/bottom-nav";
import { locationHub } from "@/lib/signalr";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
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
    </LocationProvider>
  );
}
