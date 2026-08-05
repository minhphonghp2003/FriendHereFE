"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Route, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { useDeleteTimeline } from "@/hooks/timelines";
import { formatDate } from "@/lib/format";
import type { TimelineDto } from "@/types/timeline";

interface TimelineCardProps {
  timeline: TimelineDto;
  currentUserId?: number;
  onDeleted?: (id: number) => void;
}

export const TimelineCard = ({ timeline, currentUserId, onDeleted }: TimelineCardProps) => {
  const router = useRouter();
  const { mutate: deleteTimeline, isLoading: deleting } = useDeleteTimeline();
  const [confirming, setConfirming] = useState(false);
  const isOwner = currentUserId === timeline.ownerId;

  const handleDelete = async () => {
    try {
      await deleteTimeline(timeline.id);
      onDeleted?.(timeline.id);
    } catch {}
  };

  return (
    <button
      onClick={() => router.push(`/timelines/${timeline.id}`)}
      className="border-border bg-card hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
    >
      <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
        <Route className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{timeline.caption}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {timeline.momentCount} khoảnh khắc · {formatDate(timeline.createdAt)}
        </p>
        {timeline.partners.length > 0 && (
          <div className="mt-1.5 flex items-center">
            <div className="flex -space-x-1.5">
              {timeline.partners.slice(0, 3).map((p) => (
                <div
                  key={p.userId}
                  className="bg-muted text-muted-foreground ring-card flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold ring-2"
                >
                  {p.userImage ? (
                    <img
                      src={p.userImage.thumbUrl}
                      alt={p.userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    p.userName.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
            </div>
            {timeline.partners.length > 3 && (
              <span className="text-muted-foreground ml-1.5 text-[10px]">
                +{timeline.partners.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      {isOwner && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (!confirming) {
              setConfirming(true);
              setTimeout(() => setConfirming(false), 2500);
            } else {
              handleDelete();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              if (confirming) handleDelete();
              else {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 2500);
              }
            }
          }}
          className="text-muted-foreground hover:bg-muted flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : confirming ? (
            <span className="text-destructive">Xóa?</span>
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </div>
      )}
      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
    </button>
  );
};
