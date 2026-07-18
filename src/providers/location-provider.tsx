"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./auth-provider";
import { locationHub } from "@/lib/signalr";
import { useAppDispatch } from "@/store/hooks";
import { setLocations, addLocation, removeLocation, setKicked, resetLocation } from "@/store/slices/location-slice";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      if (startedRef.current) {
        startedRef.current = false;
        dispatch(resetLocation());
        locationHub.stop();
      }
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const init = async () => {
      try {
        await locationHub.start(user.id);

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

        await locationHub.join({ userId: user.id });
      } catch (err) {
        console.error("[LocationProvider] SignalR init error:", err);
        startedRef.current = false;
      }
    };

    init();
  }, [user, dispatch]);

  return children;
}
