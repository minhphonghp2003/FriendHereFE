"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect } from "react";
import { locationHub } from "@/lib/signalr";
import type { LocationDto } from "@/lib/signalr/types";

export default function HomePage() {
  const { user } = useAuth();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [locations, setLocations] = useState<LocationDto[]>([]);
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

  useEffect(() => {
    if (!user || !position) return;

    let cancelled = false;

    const init = async () => {
      try {
        console.log("[SignalR] Starting connection...");
        await locationHub.start();
        console.log("[SignalR] Connected");

        locationHub.onReceiveLocations((locList) => {
          console.log("[SignalR] ReceiveLocations:", locList);
          setLocations(locList);
        });

        locationHub.onNewJoin((_user, _location) => {
          console.log("[SignalR] NewJoin:", _user.name, _location);
          setLocations((prev) => {
            const exists = prev.some((l) => l.userId === _user.id);
            if (exists) return prev;
            return [...prev, _location];
          });
        });

        await locationHub.join({
          userId: user.id,
          latitude: position.lat,
          longitude: position.lng,
        });
        console.log("[SignalR] Join sent");
      } catch (err) {
        if (!cancelled) console.error("[SignalR] Init error:", err);
      }
    };

    init();

    return () => {
      cancelled = true;
      locationHub.stop();
    };
  }, [user, position]);

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
          <AdvancedMarker position={position} title={`${user?.name || "You"} (me)`} />

          {locations.map((loc) => (
              <AdvancedMarker
                key={loc.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                title={loc.name}
              />
            ))}
        </Map>
      </APIProvider>
    </div>
  );
}
