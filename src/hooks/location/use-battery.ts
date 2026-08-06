"use client";

import { useState, useEffect } from "react";

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export const useBattery = (onChange?: (level: number) => void): number | null => {
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined") return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!window.isSecureContext) {
      console.warn(
        "[useBattery] Battery Status API requires a secure context (HTTPS). Page is served over HTTP on this device, so battery is unavailable.",
      );
      return;
    }
    if (!nav.getBattery) {
      console.warn(
        "[useBattery] Battery Status API is not supported in this browser (iOS Safari and Firefox do not expose battery to web pages). Battery unavailable.",
      );
      return;
    }

    let cancelled = false;
    let battery: BatteryManagerLike | null = null;

    const handler = () => {
      if (cancelled || !battery) return;
      const lvl = Math.round(battery.level * 100);
      setLevel(lvl);
      onChange?.(lvl);
    };

    nav
      .getBattery()
      .then((b) => {
        if (cancelled) return;
        battery = b;
        b.addEventListener("levelchange", handler);
        b.addEventListener("chargingchange", handler);
        handler();
      })
      .catch((err) => {
        console.warn("[useBattery] navigator.getBattery() rejected:", err);
      });

    return () => {
      cancelled = true;
      if (battery) {
        battery.removeEventListener("levelchange", handler);
        battery.removeEventListener("chargingchange", handler);
      }
    };
  }, [onChange]);

  return level;
};
