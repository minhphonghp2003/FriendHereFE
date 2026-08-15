"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTheme } from "next-themes";
import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { CustomMarker } from "@/components/home/custom-marker";
import { V2LocationTopBar } from "./v2-location-top-bar";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export function V2LocationMap() {
  const { resolvedTheme } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const locations = useAppSelector((s) => s.location.locations);
  const latitude = useAppSelector((s) => s.location.latitude);
  const longitude = useAppSelector((s) => s.location.longitude);

  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  const mapColorScheme = resolvedTheme === "dark" ? "DARK" : "LIGHT";

  useEffect(() => {
    if (latitude && longitude) {
      setMyLocation({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <p className="text-red-400">Google Maps API Key is missing</p>
      </div>
    );
  }

  return (
    <>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div className="map-wrapper">
          <GoogleMap
            defaultCenter={{ lat: 21.0285, lng: 105.8542 }}
            defaultZoom={15}
            mapId="v2-location-map"
            disableDefaultUI
            gestureHandling={"greedy"}
            className="v2-map"
            colorScheme={mapColorScheme}
          >
            {/* Render friend locations */}
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
            {myLocation && (
              <AdvancedMarker
                position={myLocation}
                className="current-user-marker"
              >
                <div className="current-user-pulse" />
              </AdvancedMarker>
            )}
          </GoogleMap>
        </div>
      </APIProvider>
      
      <V2LocationTopBar />
    </>
  );
}