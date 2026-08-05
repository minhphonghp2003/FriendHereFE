"use client";

import { Fragment, useMemo } from "react";
import { MapPin, PlaneTakeoff, PlaneLanding, Play, Loader2, ImageIcon } from "lucide-react";
import { getMomentThumbnail } from "@/services/moment";
import { cn } from "@/lib/utils";
import type { MomentDto } from "@/types/moment";

interface TimelineRouteProps {
  moments: MomentDto[];
  onMomentClick?: (momentId: number) => void;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const placeName = (moment: MomentDto): string => {
  if (!moment.location?.isShowed) return "Không có địa điểm";
  return (
    moment.location.placeName ||
    `${moment.location.latitude.toFixed(3)}, ${moment.location.longitude.toFixed(3)}`
  );
};

const RouteConnector = ({ fromLeft }: { fromLeft: boolean }) => (
  <div className="w-full">
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-10 w-full text-primary/50"
      fill="none"
    >
      <path
        d={fromLeft ? "M 88 0 C 88 20, 12 20, 12 40" : "M 12 0 C 12 20, 88 20, 88 40"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 3"
      />
    </svg>
  </div>
);

const ConnectionMarker = ({ side, plane }: { side: "left" | "right"; plane?: boolean }) => (
  <div
    className={cn(
      "absolute top-0 z-10 flex -translate-y-1/2 items-center justify-center rounded-full",
      plane ? "bg-primary text-primary-foreground h-5 w-5 shadow" : "bg-primary h-2 w-2",
      side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
    )}
  >
    {plane && <PlaneTakeoff className="h-3 w-3" />}
  </div>
);

const EndMarker = ({ side }: { side: "left" | "right" }) => (
  <div
    className={cn(
      "bg-muted text-muted-foreground ring-border absolute bottom-0 z-10 flex h-5 w-5 translate-y-1/2 items-center justify-center rounded-full ring-1",
      side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2",
    )}
  >
    <PlaneLanding className="h-3 w-3" />
  </div>
);

const RouteCard = ({ moment, onClick }: { moment: MomentDto; onClick: () => void }) => {
  const thumb = getMomentThumbnail(moment);

  return (
    <button
      onClick={onClick}
      className="border-border bg-muted relative aspect-[4/5] w-full overflow-hidden rounded-xl border text-left shadow-sm transition-transform hover:scale-[1.02]"
    >
      {thumb ? (
        <img src={thumb.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/35" />

      {moment.video && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/40">
            <Play className="h-4 w-4 fill-current" />
          </div>
        </div>
      )}

      {moment.status === "Processing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[10px] font-bold text-white ring-1 ring-white/50">
            {moment.userImage ? (
              <img src={moment.userImage.thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              moment.userName.charAt(0).toUpperCase()
            )}
          </div>
          <span className="truncate text-[11px] font-semibold text-white drop-shadow">
            {moment.userName}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {formatTime(moment.createdAt)}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="flex items-center gap-1 text-[11px] font-medium text-white drop-shadow">
          <MapPin className="h-3 w-3 shrink-0 text-white/90" />
          <span className="truncate">{placeName(moment)}</span>
        </p>
        {moment.caption && (
          <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white drop-shadow">
            {moment.caption}
          </p>
        )}
      </div>
    </button>
  );
};

export const TimelineRoute = ({ moments, onMomentClick }: TimelineRouteProps) => {
  const sorted = useMemo(
    () =>
      [...moments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [moments],
  );

  if (sorted.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-4">
      {sorted.map((moment, index) => {
        const isLeft = index % 2 === 0;
        const isLast = index === sorted.length - 1;
        const side = isLeft ? "right" : "left";
        return (
          <Fragment key={moment.id}>
            {index > 0 && <RouteConnector fromLeft={(index - 1) % 2 === 0} />}
            <div className="relative flex">
              <div className="relative w-full">
                <div
                  className={cn(
                    "border-primary/40 absolute top-0 bottom-0 border-l-2 border-dotted",
                    isLeft ? "right-0" : "left-0",
                  )}
                />
                <ConnectionMarker side={side} plane={index === 0} />
                {isLast && <EndMarker side={side} />}
                <RouteCard moment={moment} onClick={() => onMomentClick?.(moment.id)} />
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};
