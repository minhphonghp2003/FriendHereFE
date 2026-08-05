"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Route, Calendar } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTimeline, useTimelineMoments, useDeleteTimeline } from "@/hooks/timelines";
import { MomentCard } from "@/components/moments/moment-card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

const PAGE_TAKE = 10;
const LOAD_MORE_THRESHOLD = 8;

export default function TimelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const timelineId = Number(params.id);

  const { data: timeline, unavailable } = useTimeline(timelineId);
  const {
    data: moments,
    isLoading: momentsLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refetch: refetchMoments,
  } = useTimelineMoments(timelineId, PAGE_TAKE);
  const { mutate: deleteTimeline, isLoading: deleting } = useDeleteTimeline();

  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const handleToggleInfo = useCallback(() => setShowInfo((v) => !v), []);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    setCurrentIndex(Math.round(el.scrollTop / el.clientHeight));
  }, []);

  useEffect(() => {
    if (moments.length - currentIndex <= PAGE_TAKE - LOAD_MORE_THRESHOLD + 1 && hasMore) {
      loadMoreRef.current();
    }
  }, [currentIndex, moments.length, hasMore]);

  const isOwner = timeline?.ownerId === user?.id;

  const handleDelete = async () => {
    try {
      await deleteTimeline(timelineId);
      router.replace("/timelines");
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-black">
      <div className="flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-2 py-2">
        <div className="flex min-w-0 items-center gap-1">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {timeline?.caption ?? "Dòng thời gian"}
            </p>
            <p className="flex items-center gap-1 text-xs text-white/70">
              <Route className="h-3 w-3" />
              <span>{timeline?.momentCount ?? moments.length} khoảnh khắc</span>
              {timeline && (
                <>
                  <span>·</span>
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(timeline.createdAt)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive hover:bg-white/10"
            aria-label="Xóa dòng thời gian"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {timeline && timeline.partners.length > 0 && (
        <div className="flex items-center gap-1.5 bg-gradient-to-b from-black/60 to-transparent px-4 pb-2">
          <div className="flex -space-x-2">
            {timeline.partners.slice(0, 5).map((p) => (
              <div
                key={p.userId}
                className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[10px] font-bold text-white ring-2 ring-black"
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
          {timeline.partners.length > 0 && (
            <span className="truncate text-xs text-white/80">
              {timeline.partners.map((p) => p.userName).join(", ")}
            </span>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {unavailable ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-white/70">Dòng thời gian không khả dụng</p>
          </div>
        ) : momentsLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          </div>
        ) : moments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-white/70">Chưa có khoảnh khắc nào</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-full snap-y snap-mandatory overflow-y-scroll"
          >
            {moments.map((moment, index) => (
              <div key={moment.id} className="h-full w-full shrink-0 snap-start snap-always">
                <MomentCard
                  fullscreen
                  moment={moment}
                  currentUserId={user?.id}
                  active={index === currentIndex}
                  showInfo={showInfo}
                  onToggleInfo={handleToggleInfo}
                  hideTimelineChip
                  onDelete={() => refetchMoments()}
                  onHide={() => refetchMoments()}
                />
              </div>
            ))}
            <div className="flex h-16 w-full shrink-0 items-center justify-center bg-black">
              {isLoadingMore && <Loader2 className="h-5 w-5 animate-spin text-white/70" />}
              {!hasMore && moments.length > 0 && (
                <p className="text-xs text-white/50">Đã hiển thị tất cả</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
