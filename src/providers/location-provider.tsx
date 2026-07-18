"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";
import { locationHub } from "@/lib/signalr";
import { useAppDispatch } from "@/store/hooks";
import { setCurrentPosition, setLocationDenied, setLocations, addLocation, removeLocation, setKicked, resetLocation } from "@/store/slices/location-slice";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const startedRef = useRef(false);
  const hubReadyRef = useRef(false);
  const geoReadyRef = useRef(false);
  const canJoinRef = useRef(false);
  const pendingPosition = useRef<{ latitude: number; longitude: number; accuracy: number; speed?: number } | null>(null);

  useEffect(() => {
    if (!user) {
      if (startedRef.current) {
        console.log("[LocationProvider] User logged out, stopping");
        startedRef.current = false;
        hubReadyRef.current = false;
        geoReadyRef.current = false;
        canJoinRef.current = false;
        pendingPosition.current = null;
        dispatch(resetLocation());
        locationHub.stop();
      }
      return;
    }

    if (startedRef.current) {
      console.log("[LocationProvider] Already started, skipping");
      return;
    }
    startedRef.current = true;
    console.log("[LocationProvider] Starting effect for user", user.id);

    const tryJoin = () => {
      if (canJoinRef.current) return;
      canJoinRef.current = true;

      const payload: Record<string, unknown> = { userId: user!.id };
      const position = pendingPosition.current;
      if (position) {
        payload.latitude = position.latitude;
        payload.longitude = position.longitude;
        payload.accuracy = position.accuracy;
        if (position.speed !== undefined) payload.speed = position.speed;
      }
      console.log("[LocationProvider] Joining with payload:", JSON.stringify(payload));
      locationHub.join(payload as any).catch((err) =>
        console.error("[LocationProvider] Join error:", err),
      );
    };

    const init = async () => {
      try {
        console.log("[LocationProvider] init: starting hub...");
        await locationHub.start(user.id);
        console.log("[LocationProvider] init: hub started");

        locationHub.onReceiveLocations((locList) => {
          console.log(`[SignalR] Received ${locList.length} location(s)`);
          dispatch(setLocations(locList));
        });

        locationHub.onNewJoin((_user, _location) => {
          if (_user.id === user.id) return;
          console.log(`[SignalR] ${_user.name} connected at (${_location.latitude}, ${_location.longitude})`);
          dispatch(addLocation(_location));
        });

        locationHub.onUserDisconnect((userId) => {
          dispatch(removeLocation(userId));
        });

        locationHub.onKicked(() => {
          dispatch(setKicked(true));
          locationHub.stop();
        });

        hubReadyRef.current = true;
        if (geoReadyRef.current || !("geolocation" in navigator)) tryJoin();
      } catch (err) {
        console.error("[LocationProvider] SignalR init error:", err);
        startedRef.current = false;
      }
    };

    init();

    if (!("geolocation" in navigator)) return;

    console.log("[LocationProvider] Requesting geolocation...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        console.log(`[LocationProvider] Geolocation success: lat=${latitude}, lng=${longitude}, acc=${accuracy}, speed=${speed}`);
        pendingPosition.current = { latitude, longitude, accuracy, speed: speed ?? undefined };
        dispatch(setCurrentPosition({ latitude, longitude, accuracy, speed: speed ?? undefined }));
        geoReadyRef.current = true;
        if (hubReadyRef.current) tryJoin();
      },
      (err) => {
        console.warn("[LocationProvider] Geolocation error:", err.message);
        dispatch(setLocationDenied());
        geoReadyRef.current = true;
        if (hubReadyRef.current) tryJoin();
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [user, dispatch]);

  return children;
}
