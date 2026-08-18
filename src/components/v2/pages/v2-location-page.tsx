"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useTheme } from "next-themes";
import Map, { MapRef } from "react-map-gl/maplibre";
import { CustomMarker } from "@/components/home/custom-marker";
import { UserLocationList } from "@/components/home/user-location-list";
import { V2UserDetailDialog } from "@/components/v2/dialogs/v2-user-detail-dialog";
import { V2FriendsSheet } from "./v2-friends-sheet";
import { Check, Pencil, X as XIcon } from "lucide-react";
import { V2LocationSettingsDialog } from "./v2-location-settings-dialog";
import { useActiveUsers } from "@/hooks/location/use-active-users";
import { useCurrentUser } from "@/hooks/users/use-users";
import { useV2Modal } from "@/hooks/v2/use-v2-modal";
import { LOCATION_SORT } from "@/services/location";
import { locationHub } from "@/lib/signalr";
import { setMyStatus } from "@/store/slices/location-slice";


/** Auto-centers the map when a position becomes available (first fix only). */
function MapAutoCenter({ position, mapRef }: { position: { lat: number; lng: number } | undefined, mapRef: React.RefObject<MapRef | null> }) {
  const centeredRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || !position || centeredRef.current) return;
    const map = mapRef.current;
    if (map.flyTo) {
      map.flyTo({ 
        center: [position.lng, position.lat], 
        zoom: 16,
        essential: true
      });
    }
    centeredRef.current = true;
  }, [mapRef, position]);

  return null;
}

export function V2LocationPage() {
  const { resolvedTheme } = useTheme();
  const dispatch = useAppDispatch();
  const mapRef = useRef<MapRef | null>(null);

  // Use v1's Redux location store directly
  const locations = useAppSelector((s) => s.location.locations);
  const latitude = useAppSelector((s) => s.location.latitude);
  const longitude = useAppSelector((s) => s.location.longitude);
  const myStatus = useAppSelector((s) => s.location.status);
  const myBattery = useAppSelector((s) => s.location.battery);
  const movingUserIds = useAppSelector((s) => s.location.movingUserIds);
  const locationDenied = useAppSelector((s) => s.location.locationDenied);
  const user = useAppSelector((s) => s.auth.user);

  // Active users from v1 service (used for user-detail context + denied fallback list)
  const {
    data: activeUsers,
    isLoading: loadingActiveUsers,
    hasMore: activeHasMore,
    isLoadingMore: activeLoadingMore,
    loadMore: activeLoadMore,
  } = useActiveUsers(20, LOCATION_SORT.Distance);

  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Modals registered in the global single-active manager
  const userDetailModal = useV2Modal("location-user-detail");
  const locSettingsModal = useV2Modal("location-settings");

  // User detail target (unified V2 dialog fetches its own user data)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const selectedLocation = locations.find((l) => l.userId === selectedUserId);
  const selectedActive = activeUsers.find((u) => u.userId === selectedUserId);

  const openUserDetail = (userId: number) => {
    setSelectedUserId(userId);
    userDetailModal.open();
  };

  const position =
    latitude !== null && longitude !== null
      ? { lat: latitude, lng: longitude }
      : undefined;

  // My marker info: prefer SignalR (BE) response, enrich with FE data
  // v1 pattern: const myLocation = locations.find((l) => l.userId === user?.id);
  const myLocation = locations.find((l) => l.userId === user?.id);

  // v1 parity: profile avatar from /User/me as FE fallback before SignalR echoes
  const { data: currentUserProfile } = useCurrentUser();

  // BE first (SignalR echo), FE fallback (local dispatch / profile API)
  const myDisplayStatus = myLocation?.status ?? myStatus ?? null;
  const myDisplayName = myLocation?.name ?? user?.name ?? "You";
  const myAvatarThumb =
    myLocation?.image ??
    currentUserProfile?.images?.[0]?.thumbUrl ??
    currentUserProfile?.images?.[0]?.originalUrl ??
    undefined;

  let mapStyle = resolvedTheme === "dark" 
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  mapStyle = "https://tiles.openfreemap.org/styles/positron"
  // Get user initials for avatar fallback (FE enrichment)
  const userInitials = myDisplayName
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  // Close the inline status editor when tapping outside it
  useEffect(() => {
    if (!statusEditorOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = (e.target as HTMLElement).closest(".status-editor-popover");
      if (!el) setStatusEditorOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [statusEditorOpen]);

  // v1 logic (StatusEditor): save/clear status via locationHub
  const handleSaveStatus = async () => {
    const text = statusValue.trim().slice(0, 50);
    setSavingStatus(true);
    try {
      await locationHub.updateStatus(text);
      dispatch(setMyStatus(text || null));
      setStatusEditorOpen(false);
    } catch (err) {
      console.error("[V2] UpdateStatus error:", err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleClearStatus = async () => {
    setSavingStatus(true);
    try {
      await locationHub.updateStatus("");
      dispatch(setMyStatus(null));
      setStatusValue("");
      setStatusEditorOpen(false);
    } catch (err) {
      console.error("[V2] Clear status error:", err);
    } finally {
      setSavingStatus(false);
    }
  };

  const openStatusEditor = () => {
    setStatusValue(myDisplayStatus ?? "");
    setStatusEditorOpen(true);
  };



  // v1 parity: when location permission is denied, fall back to the user list
  if (locationDenied) {
    return (
      <div className="v2-location-denied">
        <p className="denied-notice">
          Location permission is blocked. Showing the people list instead — enable
          location in your browser settings to see the map.
        </p>
        <UserLocationList
          users={activeUsers}
          currentUser={user}
          onUserClick={openUserDetail}
          hasMore={activeHasMore}
          isLoadingMore={activeLoadingMore}
          onLoadMore={activeLoadMore}
        />
      </div>
    );
  }

  return (
    <div className="v2-location-container">
      <div className="map-wrapper">
        <Map
          ref={mapRef}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          initialViewState={{
            longitude: position?.lng || 105.8542,
            latitude: position?.lat || 21.0285,
            zoom: 15
          }}
          attributionControl={false}
        >
          <MapAutoCenter position={position} mapRef={mapRef} />
          
          {/* Render friend locations (excluding me) using v1's Redux store.
              Moment thumbs stay visible but open the user detail (not the moment). */}
          {locations
            .filter((location) => location.userId !== user?.id)
            .map((location) => (
              <CustomMarker
                key={location.userId}
                position={{ 
                  lat: location.latitude, 
                  lng: location.longitude 
                }}
                name={location.name || "User"}
                image={location.image || undefined}
                battery={location.battery}
                status={location.status}
                moments={location.moments}
                moving={movingUserIds.includes(location.userId)}
                size={56}
                onClick={() => openUserDetail(location.userId)}
                  onMomentClick={() => openUserDetail(location.userId)}
                />
              ))}


          {/* My marker — same style as friends (v1 CustomMarker), with status actions */}
          {position && (
            <CustomMarker
              position={position}
              name={myDisplayName}
              image={myAvatarThumb}
              isCurrentUser
              battery={myBattery}
              status={myDisplayStatus}
              size={56}
              onClick={() => openUserDetail(user?.id ?? 0)}
              moments={myLocation?.moments ?? null}
              onMomentClick={() => openUserDetail(user?.id ?? 0)}
              statusActions={
                statusEditorOpen
                  ? []
                  : [
                      {
                        key: "edit-status",
                        label: "Sửa trạng thái",
                        icon: <Pencil className="h-[10px] w-[10px]" />,
                        onClick: openStatusEditor,
                      },
                      ...(myDisplayStatus
                        ? [
                            {
                              key: "delete-status",
                              label: "Xóa trạng thái",
                              destructive: true,
                              icon: <XIcon className="h-[10px] w-[10px]" />,
                              onClick: () => handleClearStatus(),
                            },
                          ]
                        : []),
                    ]
              }
            />
          )}
        </Map>
      </div>

      {/* Floating status editor (opened from my marker's edit/add) */}
      {statusEditorOpen && position && (
        <div className="status-editor-popover">
          <input
            autoFocus
            value={statusValue}
            maxLength={50}
            onChange={(e) => setStatusValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveStatus();
              }
              if (e.key === "Escape") setStatusEditorOpen(false);
            }}
            placeholder="VD: Đang đi làm, Đừng làm phiền"
            className="status-editor-input"
          />
          <div className="status-editor-footer">
            <span className="status-editor-count">{statusValue.length}/50</span>
            <div className="status-editor-actions">
              <button
                onClick={handleSaveStatus}
                disabled={savingStatus}
                className="status-editor-btn status-editor-save"
                aria-label="Lưu trạng thái"
              >
                <Check className="status-editor-icon" />
              </button>
              {myDisplayStatus && (
                <button
                  onClick={handleClearStatus}
                  disabled={savingStatus}
                  className="status-editor-btn status-editor-clear"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <V2FriendsSheet
        onUserTap={openUserDetail}
        onSheetOpen={() => {
          // The sheet broadcasts v2:close-modals globally;
          // also reset local (non-modal) state here
          setStatusEditorOpen(false);
        }}
      />
      <V2LocationSettingsDialog
        open={locSettingsModal.isOpen}
        onOpenChange={(open) => !open && locSettingsModal.close()}
      />

      {/* User detail modal — unified V2 component (my profile OR other user w/ v1 actions) */}
      <V2UserDetailDialog
        userId={
          !userDetailModal.isOpen
            ? null
            : selectedUserId === user?.id
              ? "me"
              : selectedUserId
        }
        onClose={() => userDetailModal.close()}
        battery={
          userDetailModal.isOpen && selectedUserId !== user?.id
            ? (selectedActive?.battery ?? selectedLocation?.battery ?? null)
            : null
        }
        status={
          userDetailModal.isOpen && selectedUserId !== user?.id
            ? (selectedActive?.status ?? selectedLocation?.status ?? null)
            : null
        }
        distance={
          userDetailModal.isOpen && selectedUserId !== user?.id
            ? (selectedActive?.distance ?? null)
            : null
        }
      />

      <style jsx global>{`
        /* Location-denied fallback (v1 list view) */
        .v2-location-denied {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          background: #0a0a0a;
          padding-top: calc(64px + env(safe-area-inset-top, 0px));
          -webkit-overflow-scrolling: touch;
        }

        .denied-notice {
          margin: 0;
          padding: 12px 20px;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
          background: rgba(245, 158, 11, 0.08);
          border-bottom: 1px solid rgba(245, 158, 11, 0.2);
        }

        .v2-location-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }

        .status-editor-popover {
          position: fixed;
          top: calc(64px + env(safe-area-inset-top, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: 260px;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 3000;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
          animation: status-pop-in 0.2s cubic-bezier(0.32, 0.72, 0, 1);
        }

        @keyframes status-pop-in {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .status-editor-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
          color: #18181b;
          font-size: 13px;
          outline: none;
        }

        .status-editor-input::placeholder {
          color: rgba(0, 0, 0, 0.4);
        }

        .status-editor-input:focus {
          border-color: rgba(43, 176, 175, 0.6);
        }

        .status-editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .status-editor-count {
          font-size: 10px;
          color: rgba(0, 0, 0, 0.4);
        }

        .status-editor-actions {
          display: flex;
          gap: 6px;
        }

        .status-editor-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .status-editor-save {
          background: #2BB0AF;
          color: white;
        }

        .status-editor-save:hover:not(:disabled) {
          background: #1a8a89;
        }

        .status-editor-save:disabled,
        .status-editor-clear:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-editor-clear {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.12);
          color: #52525b;
        }

        .status-editor-icon {
          width: 12px;
          height: 12px;
        }

        /* V2 Location Top Bar */
        .v2-location-top-bar {
          position: fixed;
          top: env(safe-area-inset-top, 0px);
          left: 16px;
          right: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          z-index: 100;
          pointer-events: none;
        }

        .location-count-badge {
          background: #2BB0AF;
          color: white;
          font-size: 13px;
          font-weight: 700;
          min-width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 0 8px;
          pointer-events: auto;
        }

        .settings-toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 6px 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s;
          pointer-events: auto;
        }

        .settings-toggle-btn:hover {
          background: rgba(0, 0, 0, 0.8);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .settings-toggle-icon {
          width: 18px;
          height: 18px;
        }

        .settings-chevron {
          width: 16px;
          height: 16px;
          transition: transform 0.3s;
        }

        .settings-chevron.rotated {
          transform: rotate(180deg);
        }

          .map-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
          }

          /* Fix maplibre canvas z-index to be behind markers */
          .map-wrapper canvas {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 0 !important;
          }

          /* Ensure markers are rendered above the map canvas */
          .map-wrapper > div > div {
            z-index: 10 !important;
          }

          /* Ensure no background bleeding */
          .v2-location-container {
            background: #000;
          }
      `}</style>
    </div>
  );
}
