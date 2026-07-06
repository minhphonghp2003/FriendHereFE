"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setError("Location access denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  if (!apiKey) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center p-4">
        <p className="text-sm text-red-500">Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "calc(100dvh - 4rem)" }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={position}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="friendhere-map"
        >
          <AdvancedMarker position={position} title={user?.name || "You"} />
        </Map>
      </APIProvider>
    </div>
  );
}
