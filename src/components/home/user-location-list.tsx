"use client";

import { useMemo } from "react";
import type { ActiveUserDto } from "@/lib/signalr/types";
import { BatteryFull, BatteryMedium, BatteryLow, Loader2, MessageSquare } from "lucide-react";

const BUBBLE_COLORS = [
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
  return BUBBLE_COLORS[Math.abs(hash) % BUBBLE_COLORS.length];
};

const formatDistance = (meters: number | null | undefined): string => {
  if (meters === null || meters === undefined) return "--";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const getBatteryInfo = (level: number) => {
  if (level <= 20) return { Icon: BatteryLow, color: "#ef4444" };
  if (level <= 50) return { Icon: BatteryMedium, color: "#f59e0b" };
  return { Icon: BatteryFull, color: "#22c55e" };
};

interface UserLocationListProps {
  users: ActiveUserDto[];
  currentUser?: { id: number; name: string } | null;
  onUserClick: (userId: number) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export const UserLocationList = ({
  users,
  currentUser,
  onUserClick,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: UserLocationListProps) => {
  if (users.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="rounded-full bg-zinc-100 p-4">
          <div className="h-8 w-8 rounded-full border-2 border-zinc-300" />
        </div>
        <p className="mt-4 text-sm text-zinc-500">No one is nearby right now</p>
        <p className="mt-1 text-xs text-zinc-400">Users will appear here when they&apos;re online</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">People Nearby</h2>
        <p className="text-xs text-zinc-400">{users.length} user{users.length > 1 ? "s" : ""} online</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {users.map((loc) => (
            <UserBubble key={loc.userId} location={loc} currentUser={currentUser} onClick={onUserClick} />
          ))}
        </div>
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-100 bg-white py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
};

export const UserBubbleOverlay = ({ users, currentUser, onUserClick }: UserLocationListProps) => {
  if (users.length === 0) return null;

  return (
    <div className="absolute right-2 top-4 z-30 flex flex-col gap-2">
      {users.map((loc) => (
        <MiniBubble key={loc.userId} location={loc} currentUser={currentUser} onClick={onUserClick} />
      ))}
    </div>
  );
};

interface MiniBubbleProps {
  location: ActiveUserDto;
  currentUser?: { id: number; name: string } | null;
  onClick: (userId: number) => void;
}

const MiniBubble = ({ location, currentUser, onClick }: MiniBubbleProps) => {
  const color = useMemo(() => stringToColor(location.name), [location.name]);
  const firstLetter = location.name?.charAt(0).toUpperCase() || "?";
  const isCurrentUser = location.userId === currentUser?.id;

  return (
    <button
      onClick={() => onClick(location.userId)}
      title={location.name + (isCurrentUser ? " (You)" : "")}
      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 active:scale-95"
      style={{ backgroundColor: color }}
    >
      {location.image ? (
        <img src={location.image} alt={location.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-white">{firstLetter}</span>
      )}
    </button>
  );
};

interface UserBubbleProps {
  location: ActiveUserDto;
  currentUser?: { id: number; name: string } | null;
  onClick: (userId: number) => void;
}

const UserBubble = ({ location, currentUser, onClick }: UserBubbleProps) => {
  const color = useMemo(() => stringToColor(location.name), [location.name]);
  const firstLetter = location.name?.charAt(0).toUpperCase() || "?";
  const isCurrentUser = location.userId === currentUser?.id;
  const batteryInfo = location.battery != null ? getBatteryInfo(location.battery) : null;

  return (
    <button
      onClick={() => onClick(location.userId)}
      className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-white p-3 text-left shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow"
        style={{ backgroundColor: color }}
      >
        {location.image ? (
          <img src={location.image} alt={location.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-white">{firstLetter}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900">
          {location.name}
          {isCurrentUser && <span className="ml-1 text-xs text-zinc-400">(You)</span>}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
          <span className="text-emerald-500">Online</span>
          <span>•</span>
          <span>{formatDistance(location.distance)}</span>
        </div>
        {location.status && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-blue-600">
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span className="truncate">{location.status}</span>
          </p>
        )}
      </div>
      {batteryInfo && (
        <div className="flex shrink-0 items-center gap-1" title={`Battery ${location.battery}%`}>
          <batteryInfo.Icon className="h-4 w-4" color={batteryInfo.color} strokeWidth={2.5} />
          <span className="text-xs font-semibold" style={{ color: batteryInfo.color }}>
            {location.battery}%
          </span>
        </div>
      )}
    </button>
  );
};
