import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHereFE";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: "Trò chuyện thời gian thực và theo dõi vị trí",
    start_url: "/init",
    display: "standalone",
    background_color: "#ffffff",
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
      {
        src: "/screenshot-wide.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "FriendHere on desktop",
      },
    ],
  };
}
