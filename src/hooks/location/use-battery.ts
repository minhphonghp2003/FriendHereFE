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
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;

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
      .catch(() => {});

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
