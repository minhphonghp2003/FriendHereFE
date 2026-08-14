export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api",
  NEXT_PUBLIC_SIGNALR_APP_URL: process.env.NEXT_PUBLIC_SIGNALR_APP_URL ?? "http://localhost:5001/App",
  NEXT_PUBLIC_SIGNALR_URL: process.env.NEXT_PUBLIC_SIGNALR_URL ?? "http://localhost:5001/Location",
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE",
  // Firebase Cloud Messaging (push notifications). All empty → FCM disabled.
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  // Web Push certificate key pair (Firebase Console → Cloud Messaging → Web Push certificates)
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "",
} as const;
