"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.controller?.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Check for updates every 5 minutes
      const interval = setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);

      // When a new SW takes over, reload the page
      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      // If a new SW is waiting to activate, force it immediately
      if (registration.waiting) {
        registration.waiting.postMessage("SKIP_WAITING");
      }

      // Listen for new SW waiting
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version installed — tell it to skip waiting
            registration.waiting?.postMessage("SKIP_WAITING");
          }
        });
      });

      return () => clearInterval(interval);
    }).catch((err) => {
      console.warn("Service worker registration failed:", err);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
