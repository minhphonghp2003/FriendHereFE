"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useTheme } from "next-themes";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { CustomMarker } from "@/components/home/custom-marker";
import { V2FriendsSheet } from "./v2-friends-sheet";
import { Check, Pencil, X as XIcon } from "lucide-react";
import { V2LocationSettingsDialog } from "./v2-location-settings-dialog";
import { useActiveUsers } from "@/hooks/location/use-active-users";
import { LOCATION_SORT } from "@/services/location";
import { locationHub } from "@/lib/signalr";
import { setMyStatus } from "@/store/slices/location-slice";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/** Auto-centers the parent map when a position becomes available (first fix only). */
function MapAutoCenter({ position }: { position: google.maps.LatLngLiteral | undefined }) {
  const map = useMap();
  const centeredRef = useRef(false);

  useEffect(() => {
    if (!map || !position || centeredRef.current) return;
    map.setCenter(position);
    map.setZoom(16);
    centeredRef.current = true;
  }, [map, position]);

  return null;
}

export function V2LocationPage() {
  const { resolvedTheme } = useTheme();
  const dispatch = useAppDispatch();

  // Use v1's Redux location store directly
  const locations = useAppSelector((s) => s.location.locations);
  const latitude = useAppSelector((s) => s.location.latitude);
  const longitude = useAppSelector((s) => s.location.longitude);
  const myStatus = useAppSelector((s) => s.location.status);
  const myBattery = useAppSelector((s) => s.location.battery);
  const user = useAppSelector((s) => s.auth.user);

  // Use v1's useActiveUsers hook for friend nearby data
  const {
    data: activeUsers,
    isLoading: loadingActiveUsers,
    refetch: refetchActiveUsers,
  } = useActiveUsers(20, LOCATION_SORT.Distance);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const position =
    latitude !== null && longitude !== null
      ? ({ lat: latitude, lng: longitude } as google.maps.LatLngLiteral)
      : undefined;

  // My marker info: prefer SignalR (BE) response, enrich with FE data
  // v1 pattern: const myLocation = locations.find((l) => l.userId === user?.id);
  const myLocation = locations.find((l) => l.userId === user?.id);

  // BE first (SignalR echo), FE fallback (local dispatch)
  const myDisplayStatus = myLocation?.status ?? myStatus ?? null;
  const myDisplayName = myLocation?.name ?? user?.name ?? "You";
  const myAvatarThumb = myLocation?.image ?? undefined;

  const mapColorScheme = resolvedTheme === "dark" ? "DARK" : "LIGHT";

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

  // Filter out current user from nearby friends
  const nearbyFriends = activeUsers.filter((u) => u.userId !== user?.id);

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

  // Show if API key is missing for debugging
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white flex-col">
        <p className="text-red-400 text-lg">Google Maps API Key is missing</p>
        <p className="text-sm text-gray-400">No NEXT_PUBLIC_GOOGLE_MAPS_API_KEY env var</p>
      </div>
    );
  }

  return (
    <div className="v2-location-container">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="map-wrapper">
            <Map
              defaultCenter={{ lat: 21.0285, lng: 105.8542 }}
              defaultZoom={15}
              mapId="friendhere-map"
              disableDefaultUI
              gestureHandling="greedy"
              className="v2-map"
              colorScheme={mapColorScheme}
            >
            <MapAutoCenter position={position} />
            {/* Render friend locations (excluding me) using v1's Redux store */}
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
                  moving={false}
                  size={72}
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
                size={72}
                statusActions={
                  statusEditorOpen ? undefined : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStatusEditor();
                        }}
                        className="status-box-action"
                        aria-label="Edit status"
                      >
                        <Pencil className="status-box-action-icon" />
                      </button>
                      {myDisplayStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearStatus();
                          }}
                          disabled={savingStatus}
                          className="status-box-action status-box-action-delete"
                          aria-label="Delete status"
                        >
                          <XIcon className="status-box-action-icon" />
                        </button>
                      )}
                    </>
                  )
                }
              />
            )}
          </Map>
        </div>
      </APIProvider>

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
                aria-label="Save status"
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

      <V2FriendsSheet nearbyFriends={nearbyFriends} myLocation={position} />
      <V2LocationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <style jsx global>{`
        .v2-location-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }

        /* Status box action buttons (rendered inside v1 CustomMarker's white status box) */
        .status-box-action {
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.06);
          border: none;
          border-radius: 50%;
          color: #3f3f46;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
          transition: all 0.2s;
        }

        .status-box-action:hover:not(:disabled) {
          background: #2BB0AF;
          color: white;
        }

        .status-box-action:active {
          transform: scale(0.9);
        }

        .status-box-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-box-action-delete:hover:not(:disabled) {
          background: #ef4444;
        }

        .status-box-action-icon {
          width: 10px;
          height: 10px;
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

          .v2-map {
            width: 100%;
            height: 100%;
          }
      `}</style>
    </div>
  );
}
