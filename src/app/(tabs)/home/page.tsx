"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useAuth } from "@/providers/auth-provider";
import { useState, useCallback } from "react";
import { CustomMarker } from "@/components/home/custom-marker";
import { MarkerDetail } from "@/components/home/marker-detail";
import { UserLocationList } from "@/components/home/user-location-list";
import { useUser, useCurrentUser } from "@/hooks/users/use-users";
import { useAppSelector } from "@/store/hooks";
import type { LocationDto } from "@/lib/signalr/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, logout } = useAuth();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const locations = useAppSelector((s) => s.location.locations);
  const kicked = useAppSelector((s) => s.location.kicked);
  const locationDenied = useAppSelector((s) => s.location.locationDenied);
  const movingUserIds = useAppSelector((s) => s.location.movingUserIds);
  const latitude = useAppSelector((s) => s.location.latitude);
  const longitude = useAppSelector((s) => s.location.longitude);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: userDetail, isLoading: loadingUserDetail } = useUser(selectedUserId ?? 0);
  const { data: currentUserProfile } = useCurrentUser();

  const position = latitude !== null && longitude !== null
    ? { lat: latitude, lng: longitude } as google.maps.LatLngLiteral
    : undefined;

  const handleCurrentUserClick = useCallback(() => {
    setSelectedUserId(user?.id ?? null);
  }, [user]);

  const handleMarkerClick = useCallback((location: LocationDto) => {
    setSelectedUserId(location.userId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const kickedDialog = (
    <Dialog open={kicked} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Disconnected</DialogTitle>
          <DialogDescription>
            You were disconnected because you opened the app in another tab.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={logout} className="w-full">
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!apiKey) {
    return (
      <>
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center p-4">
          <p className="text-sm text-red-500">Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
        </div>
        {kickedDialog}
      </>
    );
  }

  if (!position && !locationDenied) {
    return (
      <>
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
        </div>
        {kickedDialog}
      </>
    );
  }

  if (locationDenied) {
    return (
      <>
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
        {kickedDialog}
      </>
    );
  }

  return (
    <>
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
                  moving={movingUserIds.includes(loc.userId)}
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
      {kickedDialog}
    </>
  );
}
