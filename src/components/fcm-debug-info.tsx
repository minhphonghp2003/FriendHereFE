"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isFirebaseConfigured } from "@/lib/fcm";
import { env } from "@/config/env";

/**
 * Debug component to help troubleshoot FCM issues between environments
 */
export function FcmDebugInfo() {
  const [debugInfo, setDebugInfo] = useState({
    isConfigured: false,
    hasServiceWorker: false,
    notificationPermission: "default",
    isHttps: false,
    userAgent: "",
    firebaseVars: {
      apiKey: false,
      projectId: false,
      messagingSenderId: false,
      appId: false,
      vapidKey: false,
    },
  });

  useEffect(() => {
    const checkEnvironment = async () => {
      setDebugInfo({
        isConfigured: isFirebaseConfigured(),
        hasServiceWorker: "serviceWorker" in navigator,
        notificationPermission:
          typeof Notification !== "undefined" ? Notification.permission : "unsupported",
        isHttps: window.location.protocol === "https:",
        userAgent: navigator.userAgent,
        firebaseVars: {
          apiKey: Boolean(env.NEXT_PUBLIC_FIREBASE_API_KEY),
          projectId: Boolean(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
          messagingSenderId: Boolean(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
          appId: Boolean(env.NEXT_PUBLIC_FIREBASE_APP_ID),
          vapidKey: Boolean(env.NEXT_PUBLIC_FIREBASE_VAPID_KEY),
        },
      });
    };

    checkEnvironment();
  }, []);

  return (
    <Card className="mx-4 mt-4">
      <CardHeader>
        <CardTitle>FCM Debug Information</CardTitle>
        <CardDescription>Environment configuration check</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <span className="font-medium">Firebase Configured:</span>
          <span className={debugInfo.isConfigured ? "text-green-600" : "text-red-600"}>
            {debugInfo.isConfigured ? "✓ Yes" : "✗ No"}
          </span>

          <span className="font-medium">Service Worker Support:</span>
          <span className={debugInfo.hasServiceWorker ? "text-green-600" : "text-red-600"}>
            {debugInfo.hasServiceWorker ? "✓ Yes" : "✗ No"}
          </span>

          <span className="font-medium">HTTPS Protocol:</span>
          <span className={debugInfo.isHttps ? "text-green-600" : "text-red-600"}>
            {debugInfo.isHttps ? "✓ Yes" : "✗ No"}
          </span>

          <span className="font-medium">Notification Permission:</span>
          <span
            className={
              debugInfo.notificationPermission === "granted" ? "text-green-600" : "text-orange-600"
            }
          >
            {debugInfo.notificationPermission}
          </span>
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="mb-2 font-medium">Firebase Environment Variables:</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <span>API Key:</span>
            <span className={debugInfo.firebaseVars.apiKey ? "text-green-600" : "text-red-600"}>
              {debugInfo.firebaseVars.apiKey ? "✓ Set" : "✗ Missing"}
            </span>
            <span>Project ID:</span>
            <span className={debugInfo.firebaseVars.projectId ? "text-green-600" : "text-red-600"}>
              {debugInfo.firebaseVars.projectId ? "✓ Set" : "✗ Missing"}
            </span>
            <span>Sender ID:</span>
            <span
              className={
                debugInfo.firebaseVars.messagingSenderId ? "text-green-600" : "text-red-600"
              }
            >
              {debugInfo.firebaseVars.messagingSenderId ? "✓ Set" : "✗ Missing"}
            </span>
            <span>App ID:</span>
            <span className={debugInfo.firebaseVars.appId ? "text-green-600" : "text-red-600"}>
              {debugInfo.firebaseVars.appId ? "✓ Set" : "✗ Missing"}
            </span>
            <span>VAPID Key:</span>
            <span className={debugInfo.firebaseVars.vapidKey ? "text-green-600" : "text-red-600"}>
              {debugInfo.firebaseVars.vapidKey ? "✓ Set" : "✗ Missing"}
            </span>
          </div>
        </div>

        <div className="text-muted-foreground mt-4 border-t pt-4 text-xs">
          <p className="break-all">User Agent: {debugInfo.userAgent}</p>
        </div>
      </CardContent>
    </Card>
  );
}
