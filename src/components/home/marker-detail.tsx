"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const MARKER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#a855f7",
];

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MARKER_COLORS[Math.abs(hash) % MARKER_COLORS.length];
};

interface MarkerDetailProps {
  name: string;
  image?: string;
  isCurrentUser?: boolean;
  onClose: () => void;
}

export const MarkerDetail = ({ name, image, isCurrentUser, onClose }: MarkerDetailProps) => {
  const color = useMemo(() => stringToColor(name), [name]);
  const firstLetter = name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white shadow"
          style={{ backgroundColor: isCurrentUser ? "#3b82f6" : color }}
        >
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-white">{firstLetter}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
            {name}
            {isCurrentUser && (
              <span className="ml-2 text-xs font-normal text-zinc-500">(You)</span>
            )}
          </p>
          <p className="text-xs text-zinc-500">
            {isCurrentUser ? "Online" : "Online"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
