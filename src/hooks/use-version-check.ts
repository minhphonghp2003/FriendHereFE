"use client";

import { useEffect, useState } from "react";

interface VersionInfo {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
}

const CURRENT_VERSION = "0.1.0"; // Should match package.json version
const CHECK_INTERVAL = 1000 * 60 * 60; // Check every hour
const STORAGE_KEY = "version_check_cache";

/**
 * Hook to check for app version updates
 * Compares local package.json version with a remote version check endpoint
 */
export function useVersionCheck() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    current: CURRENT_VERSION,
    latest: null,
    hasUpdate: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        setIsLoading(true);

        // Check if we have a cached result that's still valid
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { timestamp, version } = JSON.parse(cached);
          const now = Date.now();
          if (now - timestamp < CHECK_INTERVAL) {
            setVersionInfo((prev) => ({
              ...prev,
              latest: version,
              hasUpdate: version !== CURRENT_VERSION,
            }));
            return;
          }
        }

        // In a real app, you would fetch from your API endpoint
        // For now, we'll simulate a version check
        // const response = await fetch('/api/version-check');
        // const { latest } = await response.json();

        // Simulated response - remove this and use your actual API
        const latest = CURRENT_VERSION; // This would come from your API

        // Cache the result
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            version: latest,
          }),
        );

        setVersionInfo((prev) => ({
          ...prev,
          latest,
          hasUpdate: latest !== CURRENT_VERSION,
        }));
      } catch (error) {
        console.error("Version check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Check on mount
    checkForUpdates();

    // Set up interval for periodic checks
    const interval = setInterval(checkForUpdates, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const dismissUpdate = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        version: versionInfo.latest || CURRENT_VERSION,
      }),
    );
  };

  return {
    ...versionInfo,
    isLoading,
    dismissUpdate,
  };
}
