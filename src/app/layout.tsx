import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReduxProvider } from "@/providers/redux-provider";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE";

export const metadata: Metadata = {
  title: appName,
  description: "Real-time chat and location tracking",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
