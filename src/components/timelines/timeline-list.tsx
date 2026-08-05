"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineCard } from "./timeline-card";
import { useTimelines } from "@/hooks/timelines";

interface TimelineListProps {
  userId?: number | null;
  currentUserId?: number;
  onChanged?: () => void;
}

export const TimelineList = ({ userId = null, currentUserId, onChanged }: TimelineListProps) => {
  const { data, isLoading, isLoadingMore, error, hasMore, refetch, loadMore } =
    useTimelines(userId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100 && hasMore && !isLoadingMore) {
        loadMore();
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingMore, loadMore]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-muted-foreground text-sm">Không thể tải dòng thời gian</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
          Thử lại
        </Button>
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-muted-foreground text-sm">Chưa có dòng thời gian nào</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-4 pb-4">
      <div className="flex flex-col gap-2">
        {data.map((timeline) => (
          <TimelineCard
            key={timeline.id}
            timeline={timeline}
            currentUserId={currentUserId}
            onDeleted={onChanged}
          />
        ))}
      </div>
      <div className="flex h-16 items-center justify-center">
        {isLoadingMore && <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />}
        {!hasMore && data.length > 0 && (
          <p className="text-muted-foreground text-xs">Đã hiển thị tất cả</p>
        )}
      </div>
    </div>
  );
};
