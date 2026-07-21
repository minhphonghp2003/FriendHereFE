"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";
import { appHub } from "@/lib/signalr/app-hub";
import { locationHub } from "@/lib/signalr";
import { useAppDispatch } from "@/store/hooks";
import { setCurrentPosition, setLocationDenied, setLocations, addLocation, removeLocation, setKicked, updateOtherLocation, setMovingUser, clearMovingUser, resetLocation } from "@/store/slices/location-slice";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const startedRef = useRef(false);
  const locationHubReadyRef = useRef(false);
  const geoReadyRef = useRef(false);
  const canJoinRef = useRef(false);
  const pendingPosition = useRef<{ latitude: number; longitude: number; accuracy: number; speed?: number } | null>(null);
  const lastPosition = useRef<{ latitude: number; longitude: number } | null>(null);
  const movingTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let watchId: number | null = null;

    if (!user) {
      if (startedRef.current) {
        console.log("[LocationProvider] User logged out, stopping");
        startedRef.current = false;
        locationHubReadyRef.current = false;
        geoReadyRef.current = false;
        canJoinRef.current = false;
        pendingPosition.current = null;
        dispatch(resetLocation());
        appHub.stop();
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

      console.log("[LocationProvider] Joining location hub...");
      locationHub.join().catch((err) =>
        console.error("[LocationProvider] Join error:", err),
      );
    };

    const init = async () => {
      try {
        console.log("[LocationProvider] init: starting AppHub...");
        await appHub.start();
        if (cancelled) return;

        appHub.onKicked(() => {
          console.log("[LocationProvider] Kicked by another connection");
          dispatch(setKicked(true));
          appHub.stop();
          locationHub.stop();
        });

        console.log("[LocationProvider] init: starting LocationHub...");
        await locationHub.start();
        if (cancelled) return;

        console.log("[LocationProvider] init: hubs started");

        locationHub.onReceiveLocations((locList) => {
          console.log(`[LocationHub] Received ${locList.length} location(s)`);
          dispatch(setLocations(locList));
        });

        locationHub.onNewJoin((_user, _location) => {
          if (_user.id === user.id) return;
          console.log(`[LocationHub] ${_user.name} connected at (${_location.latitude}, ${_location.longitude})`);
          dispatch(addLocation(_location));
        });

        locationHub.onUserDisconnect((userId) => {
          dispatch(removeLocation(userId));
        });

        locationHub.onReceiveOtherMovement((location) => {
          console.log(`[LocationHub] ${location.name} moved to (${location.latitude}, ${location.longitude})`);
          dispatch(updateOtherLocation(location));
          dispatch(setMovingUser(location.userId));
          const existing = movingTimers.current.get(location.userId);
          if (existing) clearTimeout(existing);
          movingTimers.current.set(
            location.userId,
            setTimeout(() => {
              dispatch(clearMovingUser(location.userId));
              movingTimers.current.delete(location.userId);
            }, 2000),
          );
        });

        locationHubReadyRef.current = true;
        if (geoReadyRef.current || !("geolocation" in navigator)) tryJoin();
      } catch (err) {
        if (!cancelled) {
          console.error("[LocationProvider] SignalR init error:", err);
          startedRef.current = false;
        }
      }
    };

    init();

    if (!("geolocation" in navigator)) return;

    console.log("[LocationProvider] Starting position watch...");
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;

        pendingPosition.current = { latitude, longitude, accuracy, speed: speed ?? undefined };

        dispatch(setCurrentPosition({ latitude, longitude, accuracy, speed: speed ?? undefined }));

        if (!geoReadyRef.current) {
          geoReadyRef.current = true;
          if (locationHubReadyRef.current) tryJoin();
        }

        if (canJoinRef.current) {
          const prevPos = lastPosition.current;
          if (prevPos) {
            const dist = getDistance(prevPos.latitude, prevPos.longitude, latitude, longitude);
            if (dist >= 5) {
              console.log(`[LocationProvider] Moved ${dist.toFixed(1)}m, updating location`);
              locationHub.updateLocation(latitude, longitude, accuracy, speed ?? undefined);
            }
          }
          lastPosition.current = { latitude, longitude };
        }
      },
      (err) => {
        console.warn("[LocationProvider] Geolocation watch error:", err.message);
        dispatch(setLocationDenied());
        geoReadyRef.current = true;
        if (locationHubReadyRef.current) tryJoin();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    return () => {
      cancelled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      movingTimers.current.forEach((timer) => clearTimeout(timer));
      movingTimers.current.clear();
      console.log("[LocationProvider] Effect cleanup");
      startedRef.current = false;
      locationHubReadyRef.current = false;
      geoReadyRef.current = false;
      canJoinRef.current = false;
      pendingPosition.current = null;
      lastPosition.current = null;
      dispatch(resetLocation());
      appHub.stop();
      locationHub.stop();
    };
  }, [user?.id, dispatch]);

  return children;
}
