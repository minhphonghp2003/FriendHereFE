"use client";

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { useTheme } from "next-themes";
import { APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";
import { CustomMarker } from "@/components/home/custom-marker";
import { V2FriendsSheet } from "./v2-friends-sheet";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export function V2LocationPage() {
  const { resolvedTheme } = useTheme();
  
  // Use v1's Redux location store directly
  const locations = useAppSelector((s) => s.location.locations);
  const myLatitude = useAppSelector((s) => s.location.latitude);
  const myLongitude = useAppSelector((s) => s.location.longitude);
  const user = useAppSelector((s) => s.auth.user);

  const mapColorScheme = resolvedTheme === "dark" ? "DARK" : "LIGHT";

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <p className="text-red-400">Google Maps API Key is missing</p>
      </div>
    );
  }

  return (
    <div className="v2-location-container">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="map-wrapper">
          <GoogleMap
            defaultCenter={{ lat: 21.0285, lng: 105.8542 }}
            defaultZoom={15}
            mapId="v2-location-map"
            disableDefaultUI
            gestureHandling="greedy"
            className="v2-map"
            colorScheme={mapColorScheme}
          >
            {/* Render friend locations using v1's Redux store */}
            {locations.map((location) => (
              <CustomMarker
                key={location.userId}
                position={{ 
                  lat: location.latitude, 
                  lng: location.longitude 
                }}
                name={location.name || "User"}
                image={location.image || undefined}
                isCurrentUser={location.userId === user?.id}
                battery={location.battery}
                status={location.status}
                moments={location.moments}
              />
            ))}

            {/* Current user marker */}
            {myLatitude != null && myLongitude != null && (
              <div
                style={{
                  position: "absolute",
                  transform: "translate(-50%, -50%)",
                  top: "50%",
                  left: "50%",
                }}
              >
                <div className="current-user-pulse" />
              </div>
            )}
          </GoogleMap>
        </div>
      </APIProvider>

      <V2FriendsSheet />

      <style jsx global>{`
        .v2-location-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
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

        /* Current user pulse animation */
        .current-user-pulse {
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border-radius: 50%;
          position: relative;
          animation: pulse 2s infinite;
        }

        .current-user-pulse::before,
        .current-user-pulse::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.5);
          animation: pulse-ring 2s infinite;
        }

        .current-user-pulse::after {
          animation-delay: 0.5s;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes pulse-ring {
          0% {
            width: 20px;
            height: 20px;
            opacity: 1;
          }
          100% {
            width: 60px;
            height: 60px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
