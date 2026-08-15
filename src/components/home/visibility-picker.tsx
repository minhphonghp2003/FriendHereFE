"use client";

import { useState, useRef, useEffect } from "react";
import { Eye } from "lucide-react";
import {
  LOCATION_VISIBILITY_VALUES,
  LOCATION_VISIBILITY_LABELS,
  type LocationVisibilityValue,
} from "@/lib/signalr/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMyVisibility } from "@/store/slices/location-slice";
import { locationHub } from "@/lib/signalr";

const VISIBILITY_OPTIONS = Object.entries(LOCATION_VISIBILITY_LABELS) as [string, string][];

export const VisibilityPicker = () => {
  const dispatch = useAppDispatch();
  const visibility = useAppSelector((s) => s.location.visibility);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (value: LocationVisibilityValue) => {
    dispatch(setMyVisibility(value));
    locationHub.updateVisibility(value);
    setOpen(false);
  };

  const currentLabel =
    LOCATION_VISIBILITY_LABELS[visibility as LocationVisibilityValue] ??
    LOCATION_VISIBILITY_LABELS[LOCATION_VISIBILITY_VALUES.Public];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-md transition-colors hover:bg-zinc-50"
      >
        <Eye className="h-3.5 w-3.5" />
        {currentLabel}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-40 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
          {VISIBILITY_OPTIONS.map(([value, label]) => {
            const numericValue = Number(value);
            const active = numericValue === visibility;
            return (
              <button
                key={value}
                onClick={() => handleSelect(numericValue as LocationVisibilityValue)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium ${
                  active ? "bg-blue-50 text-blue-600" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
