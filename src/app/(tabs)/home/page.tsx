"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { locationHub } from "@/lib/signalr";
import { CustomMarker } from "@/components/home/custom-marker";
import { MarkerDetail } from "@/components/home/marker-detail";
import type { LocationDto } from "@/lib/signalr/types";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<{
    name: string;
    image?: string;
    isCurrentUser: boolean;
  } | null>(null);

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
          setLocations((prev) => {
            const serverIds = new Set(locList.map((l) => l.userId));
            const extras = prev.filter((l) => !serverIds.has(l.userId));
            return [...locList, ...extras];
          });
        });

        locationHub.onNewJoin((_user, _location) => {
          console.log("[SignalR] NewJoin:", _user.name, _location);
          if (_user.id === user?.id) return;
          setLocations((prev) => {
            const exists = prev.some((l) => l.userId === _user.id);
            if (exists) return prev;
            return [...prev, _location];
          });
        });

        locationHub.onUserDisconnect((userId) => {
          console.log("[SignalR] Removing user:", userId);
          setLocations((prev) => prev.filter((l) => l.userId !== userId));
        });

        locationHub.onKicked(() => {
          console.log("[SignalR] Kicked, stopping connection");
          setKicked(true);
          locationHub.stop();
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

  const handleCurrentUserClick = useCallback(() => {
    setSelectedMarker({
      name: user?.name || "You",
      isCurrentUser: true,
    });
  }, [user]);

  const handleMarkerClick = useCallback((location: LocationDto) => {
    setSelectedMarker({
      name: location.name,
      image: location.image,
      isCurrentUser: false,
    });
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMarker(null);
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

  if (kicked) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-zinc-500">You were disconnected because you opened the app in another tab.</p>
        <button onClick={() => router.refresh()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          Reconnect
        </button>
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
    <div className="relative" style={{ width: "100%", height: "calc(100dvh - 4rem)" }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={position}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="friendhere-map"
        >
          <CustomMarker
            position={position}
            name={user?.name || "You"}
            isCurrentUser
            onClick={handleCurrentUserClick}
          />

          {locations.map((loc) => (
            <CustomMarker
              key={loc.id}
              position={{ lat: loc.latitude, lng: loc.longitude }}
              name={loc.name}
              image={loc.image}
              onClick={() => handleMarkerClick(loc)}
            />
          ))}
        </Map>
      </APIProvider>

      {selectedMarker && (
        <MarkerDetail
          name={selectedMarker.name}
          image={selectedMarker.image}
          isCurrentUser={selectedMarker.isCurrentUser}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
