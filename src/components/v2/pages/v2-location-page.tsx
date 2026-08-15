"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useTheme } from "next-themes";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { CustomMarker } from "@/components/home/custom-marker";
import { V2FriendsSheet } from "./v2-friends-sheet";
import { Map as MapIcon, ChevronDown, MessageSquarePlus, MessageSquare, Check } from "lucide-react";
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
      const el = (e.target as HTMLElement).closest(
        ".status-editor-popover, .current-user-marker",
      );
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
    setStatusValue(myStatus ?? "");
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
      {/* Status widget (below header, left side): shows status or "add status" */}
      <div className="v2-status-widget">
        {statusEditorOpen ? (
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
                >
                  <Check className="status-editor-icon" />
                </button>
                {myStatus && (
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
        ) : myStatus ? (
          <button onClick={openStatusEditor} className="status-chip" aria-label="Edit status">
            <MessageSquare className="status-chip-icon" />
            <span className="status-chip-text">{myStatus}</span>
          </button>
        ) : (
          <button onClick={openStatusEditor} className="status-chip status-chip-add" aria-label="Add status">
            <MessageSquarePlus className="status-chip-icon" />
            <span className="status-chip-text">Add status</span>
          </button>
        )}
      </div>

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
                />
              ))}

            {/* Current user marker (single source of truth on FE) */}
            {position && (
              <AdvancedMarker position={position}>
                <div className="current-user-marker">
                  <div className="current-user-avatar">
                    {userInitials}
                  </div>
                  <div className="current-user-pulse" />
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </div>
      </APIProvider>

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

        /* Status widget below header */
        .v2-status-widget {
          position: fixed;
          top: calc(56px + env(safe-area-inset-top, 0px));
          left: 16px;
          z-index: 900;
        }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          max-width: 220px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          padding: 6px 12px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-chip:hover {
          background: rgba(0, 0, 0, 0.75);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .status-chip-icon {
          width: 14px;
          height: 14px;
          flex-shrink: 0;
          color: #2BB0AF;
        }

        .status-chip-add .status-chip-icon {
          color: rgba(255, 255, 255, 0.7);
        }

        .status-chip-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .status-editor-popover {
          width: 260px;
          background: rgba(10, 10, 10, 0.95);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-editor-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 10px 12px;
          color: white;
          font-size: 13px;
          outline: none;
        }

        .status-editor-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .status-editor-input:focus {
          border-color: rgba(43, 176, 175, 0.5);
        }

        .status-editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .status-editor-count {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
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
          background: rgba(43, 176, 175, 0.9);
          color: white;
        }

        .status-editor-save:hover:not(:disabled) {
          background: #2BB0AF;
        }

        .status-editor-save:disabled,
        .status-editor-clear:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-editor-clear {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
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

        /* Current user marker */
        .current-user-marker {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .current-user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 16px;
          border: 3px solid rgba(255, 255, 255, 0.8);
          position: relative;
          z-index: 2;
          overflow: hidden;
        }

        .current-user-avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .current-user-avatar-initial {
          font-size: 16px;
        }

        .current-user-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          background: rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          animation: pulse-ring 2s infinite;
          pointer-events: none;
        }

        @keyframes pulse-ring {
          0% {
            width: 48px;
            height: 48px;
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.8);
          }
          50% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            width: 48px;
            height: 48px;
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.5);
          }
        }

        /* Second pulse ring for effect */
        .current-user-pulse::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse-ring 2s infinite 1s;
        }
      `}</style>
    </div>
  );
}
