"use client";

import { useRouter } from "next/navigation";
import { Route, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineDto } from "@/types/timeline";

interface TimelineChipProps {
  timeline: TimelineDto;
  variant?: "dark" | "light";
}

export const TimelineChip = ({ timeline, variant = "dark" }: TimelineChipProps) => {
  const router = useRouter();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/legacy/timelines/${timeline.id}`);
      }}
      className={cn(
        "flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        variant === "dark"
          ? "bg-white/25 text-white shadow-sm backdrop-blur-md hover:bg-white/35"
          : "bg-muted text-foreground hover:bg-muted/70",
      )}
    >
      <Route className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{timeline.caption}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums",
          variant === "dark" ? "text-white/80" : "text-muted-foreground",
        )}
      ></span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
};
