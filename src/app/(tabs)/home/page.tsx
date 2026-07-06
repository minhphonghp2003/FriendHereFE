"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/auth-provider";

const DEFAULT_CENTER = { lat: 10.762622, lng: 106.660172 };

function loadScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src*="maps.googleapis.com/maps/api"]`,
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
}

export default function HomePage() {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey) {
      setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      setLoading(false);
      return;
    }

    let watchId: number | null = null;
    let cancelled = false;

    const init = async () => {
      try {
        await loadScript(apiKey);

        const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const { Marker } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

        if (cancelled || !mapRef.current) return;

        const map = new Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          mapId: "friendhere-map",
        });

        mapInstance.current = map;

        const marker = new Marker({
          position: DEFAULT_CENTER,
          map,
          title: user?.name || "You",
        });
        markerRef.current = marker;

        if (!cancelled) setLoading(false);

        if ("geolocation" in navigator) {
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const newPos = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              map.panTo(newPos);
              marker.setPosition(newPos);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load Google Maps");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [apiKey, user?.name]);

  if (error) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: "100%", height: "calc(100dvh - 4rem)" }} />;
}
