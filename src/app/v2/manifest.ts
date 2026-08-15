import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appName} V2`,
    short_name: `${appName} V2`,
    description: "V2 - Location sharing, moments, and real-time chat",
    start_url: "/v2",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    scope: "/v2/",
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
        label: "FriendHere V2 on mobile",
      },
    ],
    categories: ["social", "communication"],
    shortcuts: [
      {
        name: "Location",
        short_name: "Location",
        description: "See friends on the map",
        url: "/v2/location",
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
        url: "/v2/moments",
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
        url: "/v2/chat",
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