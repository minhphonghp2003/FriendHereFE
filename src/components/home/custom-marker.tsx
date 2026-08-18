"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { Marker } from "react-map-gl/maplibre";
import { BatteryFull, BatteryMedium, BatteryLow } from "lucide-react";
import { getMomentThumbnail } from "@/services/moment";
import type { MomentDto } from "@/types/moment";

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

const MARKER_WIDTH = 60;
const MARKER_HEIGHT = 60;
const MOMENT_WIDTH = 30;
const MOMENT_HEIGHT = 30;

export interface MarkerStatusAction {
  key: string;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}

interface CustomMarkerProps {
  position: { lat: number; lng: number };
  name: string;
  image?: string;
  isCurrentUser?: boolean;
  moving?: boolean;
  battery?: number | null;
  status?: string | null;
  moments?: MomentDto[] | null;
  /** Optional marker size override (px). Defaults to 60 (v1 behavior). */
  size?: number;
  /**
   * Action buttons rendered inside the status box. Clicks are handled with
   * NATIVE listeners (the marker's own click listener is native DOM and runs
   * before React's, so React stopPropagation can't isolate these buttons).
   */
  statusActions?: MarkerStatusAction[];
  onMomentClick?: (moment: MomentDto) => void;
  onClick?: () => void;
}

const getBatteryIcon = (level: number) => {
  if (level <= 20) return { Icon: BatteryLow, color: "#ef4444" };
  if (level <= 50) return { Icon: BatteryMedium, color: "#f59e0b" };
  return { Icon: BatteryFull, color: "#22c55e" };
};

/**
 * Status box action button with NATIVE event isolation.
 *
 * Google Maps synthesizes the marker's click from pointerdown/pointerup, and
 * those listeners sit on an ANCESTOR of this button (bubble phase). A listener
 * attached directly to the button fires FIRST (target phase), so stopping
 * propagation here prevents the marker from ever registering the gesture —
 * while the button's own native click still runs the action.
 */
const StatusActionButton = ({
  action,
  actionsRef,
}: {
  action: MarkerStatusAction;
  actionsRef: React.RefObject<MarkerStatusAction[]>;
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const stop = (e: Event) => {
      e.stopPropagation();
    };
    const run = (e: Event) => {
      e.stopPropagation();
      actionsRef.current.find((a) => a.key === action.key)?.onClick();
    };

    // Kill the marker's gesture synthesis at the target (button) level
    el.addEventListener("pointerdown", stop);
    el.addEventListener("pointerup", stop);
    el.addEventListener("mousedown", stop);
    el.addEventListener("mouseup", stop);
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("touchend", stop, { passive: true });
    // Run the action on click (fire once, isolated from the marker)
    el.addEventListener("click", run);

    return () => {
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("pointerup", stop);
      el.removeEventListener("mousedown", stop);
      el.removeEventListener("mouseup", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchend", stop);
      el.removeEventListener("click", run);
    };
  }, [action.key, actionsRef]);

  return (
    <button
      ref={btnRef}
      type="button"
      title={action.label}
      aria-label={action.label}
      className={`flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-500/10 p-0 text-zinc-700 transition-colors hover:bg-teal-600 hover:text-white ${
        action.destructive ? "hover:!bg-red-500" : ""
      }`}
    >
      {action.icon}
    </button>
  );
};

export const CustomMarker = ({
  position,
  name,
  image,
  isCurrentUser,
  moving,
  battery,
  status,
  moments,
  size,
  statusActions,
  onMomentClick,
  onClick,
}: CustomMarkerProps) => {
  const [hovered, setHovered] = useState(false);
  // Latest action handlers for the native button listeners below
  const actionsRef = useRef<MarkerStatusAction[]>([]);
  actionsRef.current = statusActions ?? [];

  const color = useMemo(() => stringToColor(name), [name]);
  const firstLetter = name?.charAt(0).toUpperCase() || "?";

  const pinColor = isCurrentUser ? "#3b82f6" : color;

  const batteryInfo = battery != null ? getBatteryIcon(battery) : null;

  const visibleMoments = moments ?? [];

  const markerWidth = size ?? MARKER_WIDTH;
  const markerHeight = size ?? MARKER_HEIGHT;
  const momentWidth = size ? Math.round(size / 2) : MOMENT_WIDTH;
  const momentHeight = size ? Math.round(size / 2) : MOMENT_HEIGHT;

  return (
    <Marker
      longitude={position.lng}
      latitude={position.lat}
      style={{ zIndex: 100 }}
    >
      <style jsx global>{`
        @keyframes markerPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
      <div
        className="relative transition-transform duration-200"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        style={{
          transform: hovered ? "scale(1.06)" : "scale(1)",
          transformOrigin: "bottom center",
          filter: moving
            ? "drop-shadow(0 2px 6px rgba(0,0,0,0.3)) drop-shadow(0 0 14px " + pinColor + ")"
            : "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
          cursor: "pointer",
          zIndex: 100,
          position: "relative"
        }}
      >
        {(status || (statusActions && statusActions.length > 0)) && (
          <div
            className={`absolute left-1/2 z-10 max-w-[200px] -translate-x-1/2 rounded-4xl border border-zinc-200 bg-white px-2.5 py-1 text-center text-[11px] leading-tight font-semibold text-zinc-700 shadow-md ${
              statusActions ? "pointer-events-auto flex items-center gap-1" : "pointer-events-none"
            }`}
            style={{ bottom: "calc(100% + 4px)" }}
          >
            {status ? (
              <span className="block truncate">{status}</span>
            ) : (
              <span className="block truncate text-zinc-400">Add status</span>
            )}
            {statusActions?.map((action) => (
              <StatusActionButton key={action.key} action={action} actionsRef={actionsRef} />
            ))}
          </div>
        )}
        <div
          className="relative overflow-hidden rounded-full border-[3px]"
          style={{
            width: markerWidth,
            height: markerHeight,
            borderColor: pinColor,
            boxShadow: "0 0 0 2px #fff, 0 4px 14px rgba(0,0,0,0.35)",
            animation: moving ? "markerPulse 1s ease-in-out infinite" : undefined,
          }}
        >
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="60px"
              priority={isCurrentUser}
              className="rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: pinColor }}
            >
              <span className="text-4xl font-bold text-white drop-shadow">{firstLetter}</span>
            </div>
          )}
        </div>
        {batteryInfo && (
          <div
            className="pointer-events-none absolute -right-1.5 -bottom-1.5 flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1.5 py-0.5 shadow-md"
            title={`Battery ${battery}%`}
          >
            <batteryInfo.Icon className="h-3 w-3" color={batteryInfo.color} strokeWidth={2.5} />
            <span
              className="text-[10px] leading-none font-bold"
              style={{ color: batteryInfo.color }}
            >
              {battery}%
            </span>
          </div>
        )}
        {visibleMoments.length > 0 && (
          <div
            className="absolute top-1/2 z-20 flex -translate-y-1/2 items-center"
            style={{ left: `calc(100% - ${momentWidth / 2}px)` }}
          >
            {visibleMoments.slice(0, 3).map((m, i) => {
              const thumb = getMomentThumbnail(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.caption ?? `${m.userName}'s moment`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMomentClick?.(m);
                  }}
                  className={`relative overflow-hidden rounded-md border-2 border-white bg-zinc-200 shadow-md transition-transform duration-200 hover:-translate-y-1 ${i > 0 ? "-ml-2.5" : ""}`}
                  style={{ width: momentWidth, height: momentHeight, zIndex: i + 1 }}
                >
                  {thumb ? (
                    <Image
                      src={thumb.thumbUrl}
                      alt={m.caption ?? m.userName}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-600">
                      {m.id}
                    </span>
                  )}
                </button>
              );
            })}
            {visibleMoments.length > 3 && (
              <span className="ml-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 shadow-md">
                +{visibleMoments.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Marker>
  );
};
