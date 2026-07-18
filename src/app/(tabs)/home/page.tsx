"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useAuth } from "@/providers/auth-provider";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { locationHub } from "@/lib/signalr";
import { CustomMarker } from "@/components/home/custom-marker";
import { MarkerDetail } from "@/components/home/marker-detail";
import { UserLocationList } from "@/components/home/user-location-list";
import { useUser, useCurrentUser } from "@/hooks/users/use-users";
import { useAppSelector } from "@/store/hooks";
import type { LocationDto } from "@/lib/signalr/types";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const locations = useAppSelector((s) => s.location.locations);
  const kicked = useAppSelector((s) => s.location.kicked);
  const [position, setPosition] = useState<google.maps.LatLngLiteral | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: userDetail, isLoading: loadingUserDetail } = useUser(selectedUserId ?? 0);
  const { data: currentUserProfile } = useCurrentUser({ enabled: !user?.isWalkIn });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        locationHub.join({
          userId: user!.id,
          latitude: coords.lat,
          longitude: coords.lng,
        }).catch(() => {});
      },
      () => {
        setLocationDenied(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCurrentUserClick = useCallback(() => {
    setSelectedUserId(user?.id ?? null);
  }, [user]);

  const handleMarkerClick = useCallback((location: LocationDto) => {
    setSelectedUserId(location.userId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedUserId(null);
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

  if (!position && !locationDenied) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
      </div>
    );
  }

  if (locationDenied) {
    return (
      <div className="relative" style={{ width: "100%", height: "calc(100dvh - 4rem)" }}>
        <UserLocationList
          users={locations.filter((l) => l.userId !== user?.id)}
          currentUser={user}
          onUserClick={(userId) => setSelectedUserId(userId)}
        />

        {selectedUserId !== null && (
          <MarkerDetail
            isCurrentUser={selectedUserId === user?.id}
            currentUser={user}
            userDetail={userDetail ?? null}
            loading={loadingUserDetail}
            onClose={handleCloseDetail}
          />
        )}
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
          {position && (
            <CustomMarker
              position={position}
              name={user?.name || "You"}
              image={currentUserProfile?.images?.[0]?.thumbUrl || undefined}
              isCurrentUser
              onClick={handleCurrentUserClick}
            />
          )}

          {locations
            .filter((loc) => loc.userId !== user?.id)
            .map((loc) => (
              <CustomMarker
                key={loc.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                name={loc.name}
                image={loc.image || undefined}
                onClick={() => handleMarkerClick(loc)}
              />
            ))}
        </Map>
      </APIProvider>

      {selectedUserId !== null && (
        <MarkerDetail
          isCurrentUser={selectedUserId === user?.id}
          currentUser={user}
          userDetail={userDetail ?? null}
          loading={loadingUserDetail}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
