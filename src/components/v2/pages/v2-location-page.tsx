"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import Map, { MapRef } from "react-map-gl/maplibre";
import { CustomMarker } from "@/components/home/custom-marker";
import { UserLocationList } from "@/components/home/user-location-list";
import { V2UserDetailDialog } from "@/components/v2/dialogs/v2-user-detail-dialog";
import { V2FriendsSheet } from "./v2-friends-sheet";
import { Check, Crosshair, Pencil, X as XIcon } from "lucide-react";
import { V2LocationSettingsDialog } from "./v2-location-settings-dialog";
import { useActiveUsers } from "@/hooks/location/use-active-users";
import { useCurrentUser } from "@/hooks/users/use-users";
import { useV2Modal } from "@/hooks/v2/use-v2-modal";
import { LOCATION_SORT } from "@/services/location";
import { locationHub } from "@/lib/signalr";
import { setMyStatus } from "@/store/slices/location-slice";
import { V2_LAST_MAP_VIEW_KEY } from "@/constants";

// Vietnam geographic boundaries [sw_lng, sw_lat, ne_lng, ne_lat]
const VIETNAM_BOUNDS: [number, number, number, number] = [102.0, 8.0, 117.0, 24.0];

// Vietnam rough center — only used when there is no saved view AND no GPS fix yet
const VIETNAM_CENTER: [number, number] = [105.8542, 21.0285];

interface MapView {
  lng: number;
  lat: number;
  zoom: number;
}

/** Read the persisted last map view (returns null when absent/invalid). */
function loadLastMapView(): MapView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(V2_LAST_MAP_VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapView>;
    if (
      typeof parsed.lng !== "number" ||
      typeof parsed.lat !== "number" ||
      typeof parsed.zoom !== "number" ||
      Number.isNaN(parsed.lng) ||
      Number.isNaN(parsed.lat)
    ) {
      return null;
    }
    return { lng: parsed.lng, lat: parsed.lat, zoom: parsed.zoom };
  } catch {
    return null;
  }
}

/** Persist the current map view so reopening the page restores it. */
function saveLastMapView(view: MapView) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(V2_LAST_MAP_VIEW_KEY, JSON.stringify(view));
  } catch {
    // storage full/unavailable — non-critical, ignore
  }
}


/** Auto-centers the map when a position becomes available (first fix only).
 *  Skipped when a saved view exists — the user's last position wins over a GPS refix. */
function MapAutoCenter({
  position,
  mapRef,
  disabled,
}: {
  position: { lat: number; lng: number } | undefined;
  mapRef: React.RefObject<MapRef | null>;
  disabled: boolean;
}) {
  const centeredRef = useRef(false);

  useEffect(() => {
    if (disabled || centeredRef.current) return;
    if (!mapRef.current || !position) return;
    const map = mapRef.current;
    if (map.flyTo) {
      map.flyTo({
        center: [position.lng, position.lat],
        zoom: 16,
        essential: true
      });
    }
    centeredRef.current = true;
  }, [mapRef, position, disabled]);

  return null;
}

export function V2LocationPage() {
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

  // Restored map view (lazy-init once per mount; null when nothing saved)
  const [savedView] = useState<MapView | null>(() => loadLastMapView());

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

  // Persist the map view whenever the user moves/zooms (debounced via moveend)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const persist = () => {
      const c = map.getCenter();
      saveLastMapView({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
    };
    map.on("moveend", persist);
    return () => {
      map.off("moveend", persist);
    };
  }, []); // mapRef stable; Map children mount after Map so ref is set by effect time

  // Locate-me button: fly back to the current GPS position
  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!map) return;
    if (position) {
      map.flyTo({ center: [position.lng, position.lat], zoom: 16, essential: true });
    } else {
      // No fix yet: fit to Vietnam instead of doing nothing
      map.fitBounds(VIETNAM_BOUNDS, { padding: 40, duration: 800 });
    }
  };

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

  const mapStyle = "https://tiles.versatiles.org/assets/styles/colorful/style.json"
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
            // Priority: saved last view > current GPS fix > Vietnam center
            longitude: savedView?.lng ?? position?.lng ?? VIETNAM_CENTER[0],
            latitude: savedView?.lat ?? position?.lat ?? VIETNAM_CENTER[1],
            zoom: savedView?.zoom ?? 15
          }}
          maxBounds={VIETNAM_BOUNDS}
          minZoom={6}
          maxZoom={18}
          attributionControl={false}
        >
          {/* Skip GPS auto-center when a saved view exists — restore instead */}
          <MapAutoCenter position={position} mapRef={mapRef} disabled={savedView !== null} />
          
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

      {/* Locate-me button — below the nav (toggle) button on the right */}
      <button
        onClick={handleLocateMe}
        className="locate-me-btn"
        aria-label="Về vị trí của tôi"
      >
        <Crosshair className="locate-me-icon" />
      </button>

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
          /* flat translucent dark glass — no gradient */
          background: rgb(13 17 21 / 0.88);
          backdrop-filter: blur(32px) brightness(0.5) saturate(1.3);
          -webkit-backdrop-filter: blur(32px) brightness(0.5) saturate(1.3);
          border: 1px solid rgb(125 222 208 / 0.2);
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 3000;
          box-shadow:
            0 12px 40px rgb(0 0 0 / 0.4),
            inset 0 1px 0 rgb(255 255 255 / 0.06);
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
          background: rgb(255 255 255 / 0.08);
          border: 1px solid rgb(255 255 255 / 0.18);
          border-radius: 10px;
          padding: 10px 12px;
          color: rgb(245 250 249 / 0.95);
          font-size: 13px;
          outline: none;
        }

        .status-editor-input::placeholder {
          color: rgb(255 255 255 / 0.4);
        }

        .status-editor-input:focus {
          border-color: rgb(125 222 208 / 0.6);
        }

        .status-editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .status-editor-count {
          font-size: 10px;
          color: rgb(255 255 255 / 0.5);
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
          background: #7DDED0;
          color: rgb(15 20 24);
        }

        .status-editor-save:hover:not(:disabled) {
          background: #6DC8C0;
        }

        .status-editor-save:disabled,
        .status-editor-clear:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-editor-clear {
          background: rgb(255 255 255 / 0.1);
          border: 1px solid rgb(255 255 255 / 0.2);
          color: rgb(245 250 249 / 0.85);
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

          /* Locate-me button — same visual family as the toggle nav button
             (nav: right 20px / bottom 130px, 56px) — sits right below it */
          .locate-me-btn {
            position: fixed;
            right: 20px;
            bottom: 66px;
            z-index: 500; /* same layer as the nav button */
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            border: 1px solid rgb(125 222 208 / 0.3);
            border-radius: 50%;
            background: rgb(13 17 21 / 0.85);
            backdrop-filter: blur(24px) brightness(0.6);
            -webkit-backdrop-filter: blur(24px) brightness(0.6);
            color: #7DDED0;
            cursor: pointer;
            box-shadow: 0 4px 16px rgb(0 0 0 / 0.35);
            transition: transform 0.2s ease, background 0.2s ease;
          }

          .locate-me-btn:hover {
            background: rgb(13 17 21 / 0.95);
            transform: translateY(-2px);
          }

          .locate-me-btn:active {
            transform: scale(0.94);
          }

          .locate-me-icon {
            width: 20px;
            height: 20px;
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
