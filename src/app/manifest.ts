import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: "Location sharing, moments, and real-time chat",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#2BB0AF",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "1080x1920",
        type: "image/png",
        label: "FriendHere on mobile",
      },
    ],
    categories: ["social", "communication"],
    shortcuts: [
      {
        name: "Location",
        short_name: "Location",
        description: "See friends on the map",
        url: "/location",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
          },
        ],
      },
      {
        name: "Moments",
        short_name: "Moments",
        description: "View and share moments",
        url: "/moments",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
          },
        ],
      },
      {
        name: "Chat",
        short_name: "Chat",
        description: "Message your friends",
        url: "/chat",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
          },
        ],
      },
    ],
  };
}
