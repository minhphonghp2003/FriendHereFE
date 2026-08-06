"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useAuth } from "@/providers/auth-provider";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { Map as MapIcon, List } from "lucide-react";
import { CustomMarker } from "@/components/home/custom-marker";
import { MarkerDetail } from "@/components/home/marker-detail";
import { UserLocationList } from "@/components/home/user-location-list";
import { VisibilityPicker } from "@/components/home/visibility-picker";
import { StatusEditor } from "@/components/home/status-editor";
import { useUser, useCurrentUser } from "@/hooks/users/use-users";
import { useActiveUsers } from "@/hooks/location/use-active-users";
import { LOCATION_SORT } from "@/services/location";
import { useAppSelector } from "@/store/hooks";
import type { LocationDto } from "@/lib/signalr/types";
import { appHub } from "@/lib/signalr/app-hub";

type ViewMode = "map" | "list";

export default function HomePage() {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const locations = useAppSelector((s) => s.location.locations);
  const locationDenied = useAppSelector((s) => s.location.locationDenied);
  const movingUserIds = useAppSelector((s) => s.location.movingUserIds);
  const latitude = useAppSelector((s) => s.location.latitude);
  const longitude = useAppSelector((s) => s.location.longitude);
  const myBattery = useAppSelector((s) => s.location.battery);
  const myStatus = useAppSelector((s) => s.location.status);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");

  const mapColorScheme = resolvedTheme === "dark" ? "DARK" : "LIGHT";
  const { data: userDetail, isLoading: loadingUserDetail, refetch: refetchUserDetail } = useUser(selectedUserId ?? 0);
  const { data: currentUserProfile } = useCurrentUser();
  const {
    data: activeUsers,
    isLoading: loadingActiveUsers,
    isLoadingMore,
    hasMore,
    refetch: refetchActiveUsers,
    loadMore,
  } = useActiveUsers(20, LOCATION_SORT.Distance);

  const effectiveMode: ViewMode = locationDenied ? "list" : viewMode;

  useEffect(() => {
    if (selectedUserId === null || !user) return;

    const getOpponentId = (dto: { user1Id: number; user2Id: number }) => {
      return dto.user1Id === user.id ? dto.user2Id : dto.user1Id;
    };

    const unsubCreated = appHub.onReceiveFriendshipCreated((dto) => {
      if (getOpponentId(dto) === selectedUserId) {
        refetchUserDetail();
      }
    });
    const unsubAccepted = appHub.onReceiveFriendshipAccepted((dto) => {
      if (getOpponentId(dto) === selectedUserId) {
        refetchUserDetail();
      }
    });
    const unsubBlocked = appHub.onReceiveFriendshipBlocked((dto) => {
      if (getOpponentId(dto) === selectedUserId) {
        refetchUserDetail();
      }
    });
    const unsubUnblocked = appHub.onReceiveFriendshipUnblocked((dto) => {
      if (getOpponentId(dto) === selectedUserId) {
        refetchUserDetail();
      }
    });

    return () => {
      unsubCreated();
      unsubAccepted();
      unsubBlocked();
      unsubUnblocked();
    };
  }, [selectedUserId, user, refetchUserDetail]);

  const position = latitude !== null && longitude !== null
    ? { lat: latitude, lng: longitude } as google.maps.LatLngLiteral
    : undefined;

  const visibleLocations = useMemo(
    () => locations.filter((loc) => loc.userId !== user?.id),
    [locations, user?.id],
  );

  const selectedLocation = locations.find((l) => l.userId === selectedUserId);
  const selectedActive = activeUsers.find((u) => u.userId === selectedUserId);
  const selectedBattery =
    selectedActive?.battery ?? selectedLocation?.battery ?? (selectedUserId === user?.id ? myBattery ?? undefined : undefined);
  const selectedStatus =
    selectedLocation?.status ?? selectedActive?.status ?? (selectedUserId === user?.id ? myStatus ?? undefined : undefined);
  const selectedDistance = selectedActive?.distance ?? null;

  const handleCurrentUserClick = useCallback(() => {
    setSelectedUserId(user?.id ?? null);
  }, [user]);

  const handleMarkerClick = useCallback((location: LocationDto) => {
    setSelectedUserId(location.userId);
  }, []);

  const handleUserClick = useCallback((userId: number) => {
    setSelectedUserId(userId);
  }, []);

  const handleToggleView = useCallback(() => {
    setViewMode((v) => {
      const next = v === "map" ? "list" : "map";
      if (next === "list") refetchActiveUsers();
      return next;
    });
  }, [refetchActiveUsers]);

  const handleCloseDetail = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const renderMarkerDetail = (isCurrentUser: boolean) => (
    <MarkerDetail
      isCurrentUser={isCurrentUser}
      currentUser={user}
      userDetail={userDetail ?? null}
      loading={loadingUserDetail}
      battery={isCurrentUser ? (myBattery ?? undefined) : selectedBattery}
      status={isCurrentUser ? (myStatus ?? undefined) : selectedStatus}
      distance={isCurrentUser ? null : selectedDistance}
      onClose={handleCloseDetail}
      onFriendshipChange={refetchUserDetail}
    />
  );

  if (!apiKey) {
    return (
      <>
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center p-4">
          <p className="text-sm text-red-500">Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
        </div>
      </>
    );
  }

  if (effectiveMode === "map") {
    if (!position) {
      return (
        <>
          <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="relative" style={{ width: "100%", height: "calc(100dvh - 4rem)" }}>
          <APIProvider apiKey={apiKey}>
            <Map
              key={mapColorScheme}
              defaultCenter={position}
              defaultZoom={15}
              gestureHandling="greedy"
              disableDefaultUI
              colorScheme={mapColorScheme}
              mapId="friendhere-map"
            >
              {position && (
                <CustomMarker
                  position={position}
                  name={user?.name || "You"}
                  image={currentUserProfile?.images?.[0]?.thumbUrl || undefined}
                  isCurrentUser
                  battery={myBattery ?? undefined}
                  status={myStatus ?? undefined}
                  onClick={handleCurrentUserClick}
                />
              )}

              {visibleLocations.map((loc) => (
                <CustomMarker
                  key={loc.id}
                  position={{ lat: loc.latitude, lng: loc.longitude }}
                  name={loc.name}
                  image={loc.image || undefined}
                  moving={movingUserIds.includes(loc.userId)}
                  battery={loc.battery}
                  status={loc.status}
                  onClick={() => handleMarkerClick(loc)}
                />
              ))}
            </Map>
          </APIProvider>

          <div className="absolute right-2 top-4 z-40 flex flex-col items-end gap-2">
            <VisibilityPicker />
            <StatusEditor />
            <button
              onClick={handleToggleView}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-md transition-colors hover:bg-zinc-50"
            >
              <List className="h-3.5 w-3.5" />
              Danh sách
            </button>
          </div>

          {selectedUserId !== null && renderMarkerDetail(selectedUserId === user?.id)}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="relative" style={{ width: "100%", height: "calc(100dvh - 4rem)" }}>
        <div className="absolute right-2 top-4 z-40 flex flex-col items-end gap-2">
          <VisibilityPicker />
          <StatusEditor />
          {!locationDenied && (
            <button
              onClick={handleToggleView}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-md transition-colors hover:bg-zinc-50"
            >
              <MapIcon className="h-3.5 w-3.5" />
              Bản đồ
            </button>
          )}
        </div>
        {loadingActiveUsers ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
          </div>
        ) : (
          <UserLocationList
            users={activeUsers}
            currentUser={user}
            onUserClick={handleUserClick}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        )}

        {selectedUserId !== null && renderMarkerDetail(selectedUserId === user?.id)}
      </div>
    </>
  );
}
