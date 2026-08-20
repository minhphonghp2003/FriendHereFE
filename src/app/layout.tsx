import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { KeyboardViewport } from "@/components/keyboard-viewport";
import { ReduxProvider } from "@/providers/redux-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { PushProvider } from "@/providers/push-provider";
import { OfflineProvider } from "@/providers/offline-provider";
import { UnreadCountProvider } from "@/providers/unread-count-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { VersionUpdateAlert } from "@/components/version-update-alert";
import "./globals.css";

// Inter: best-in-class Vietnamese diacritics rendering for a social UI
// (tall, legible marks like ề, ậ, ữ), variable weight, self-hosted via next/font.
const inter = Inter({
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-inter",
});

const gaId = process.env.NEXT_PUBLIC_GA_ID;

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE";

export const metadata: Metadata = {
  title: appName,
  description: "Trò chuyện thời gian thực và theo dõi vị trí",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: appName,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
  themeColor: "#7DDED0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="http://phongpc.local:9000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <KeyboardViewport />
        <ThemeProvider>
          <ReduxProvider>
            <AuthProvider>
              <PushProvider>
                <UnreadCountProvider>
                  <OfflineProvider>
                    <VersionUpdateAlert />
                    <OfflineBanner />
                    <div id="app-root" className="app-root">
                      {children}
                    </div>
                  </OfflineProvider>
                </UnreadCountProvider>
              </PushProvider>
            </AuthProvider>
          </ReduxProvider>
          <Toaster position="top-right" richColors />
          <ServiceWorkerRegister />
        </ThemeProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}
