"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/auth-provider";

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (el: HTMLElement, opts: google.maps.MapOptions) => google.maps.Map;
        Marker: new (opts: google.maps.MarkerOptions) => google.maps.Marker;
      };
    };
  }
}

const DEFAULT_CENTER = { lat: 10.762622, lng: 106.660172 };

function loadScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
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

    loadScript(apiKey)
      .then(() => {
        if (!mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
          ],
        });

        mapInstance.current = map;

        const marker = new window.google.maps.Marker({
          position: DEFAULT_CENTER,
          map,
          title: user?.name || "You",
        });
        markerRef.current = marker;

        setLoading(false);

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
      })
      .catch(() => {
        setError("Failed to load Google Maps");
        setLoading(false);
      });

    return () => {
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
