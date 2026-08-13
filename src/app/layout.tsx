import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ReduxProvider } from "@/providers/redux-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const gaId = process.env.NEXT_PUBLIC_GA_ID;

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE";

export const metadata: Metadata = {
  title: appName,
  description: "Trò chuyện thời gian thực và theo dõi vị trí",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="http://phongpc.local:9000" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReduxProvider>
            <AuthProvider>
              {children}
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
