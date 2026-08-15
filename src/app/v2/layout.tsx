"use client";

import { ReactNode, useEffect } from "react";
import { LocationProvider } from "@/providers/location-provider";
import { CallProvider } from "@/providers/call-provider";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { appHub } from "@/lib/signalr/app-hub";
import { locationHub } from "@/lib/signalr";
import { V2Header } from "@/components/v2/header/v2-header";
import { V2ToggleNav } from "@/components/v2/nav/v2-toggle-nav";

interface V2LayoutProps {
  children: ReactNode;
}

export default function V2Layout({ children }: V2LayoutProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

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
        <div className="v2-app v2-theme">
          <V2Header />
          <main className="v2-content">
            {children}
          </main>
          <V2ToggleNav />
        </div>

        <style jsx global>{`
          html,
          body {
            height: 100%;
            margin: 0;
            padding: 0;
          }

          .v2-app {
            display: flex;
            flex-direction: column;
            height: 100dvh;
            width: 100vw;
            overflow: hidden;
            position: relative;
            background: #000;
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
        `}</style>
      </CallProvider>
    </LocationProvider>
  );
}
