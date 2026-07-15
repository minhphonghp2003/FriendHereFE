"use client";

import { useMemo } from "react";
import type { LocationDto } from "@/lib/signalr/types";

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

interface UserLocationListProps {
  users: LocationDto[];
  currentUser?: { id: number; name: string } | null;
  onUserClick: (userId: number) => void;
}

export const UserLocationList = ({ users, currentUser, onUserClick }: UserLocationListProps) => {
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
            <UserBubble key={loc.id} location={loc} currentUser={currentUser} onClick={onUserClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

export const UserBubbleOverlay = ({ users, currentUser, onUserClick }: UserLocationListProps) => {
  if (users.length === 0) return null;

  return (
    <div className="absolute right-2 top-4 z-30 flex flex-col gap-2">
      {users.map((loc) => (
        <MiniBubble key={loc.id} location={loc} currentUser={currentUser} onClick={onUserClick} />
      ))}
    </div>
  );
};

interface MiniBubbleProps {
  location: LocationDto;
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
  location: LocationDto;
  currentUser?: { id: number; name: string } | null;
  onClick: (userId: number) => void;
}

const UserBubble = ({ location, currentUser, onClick }: UserBubbleProps) => {
  const color = useMemo(() => stringToColor(location.name), [location.name]);
  const firstLetter = location.name?.charAt(0).toUpperCase() || "?";
  const isCurrentUser = location.userId === currentUser?.id;

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
        <p className="mt-0.5 text-xs text-emerald-500">Online</p>
      </div>
    </button>
  );
};
