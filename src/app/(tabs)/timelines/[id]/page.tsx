"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Route } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTimeline, useTimelineMoments, useDeleteTimeline } from "@/hooks/timelines";
import { TimelineRoute } from "@/components/timelines/timeline-route";
import { MomentDetailOverlay } from "@/components/moments/moment-detail-overlay";
import { LoadingVideo } from "@/components/common/loading-video";
import { Button } from "@/components/ui/button";

const PAGE_TAKE = 20;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

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
  } = useTimelineMoments(timelineId, PAGE_TAKE);
  const { mutate: deleteTimeline, isLoading: deleting } = useDeleteTimeline();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewMomentId, setViewMomentId] = useState<number | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150 && hasMore && !isLoadingMore) {
        loadMore();
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingMore, loadMore]);

  const isOwner = timeline?.ownerId === user?.id;

  const handleDelete = async () => {
    try {
      await deleteTimeline(timelineId);
      router.replace("/timelines");
    } catch {}
  };

  const sortedMoments = [...moments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const firstMoment = sortedMoments[0];
  const lastMoment = sortedMoments[sortedMoments.length - 1];

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="flex items-center gap-1 px-2 pt-3">
        <button
          onClick={() => router.back()}
          className="hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight font-bold">
            {timeline?.caption ?? "Hành trình"}
          </h1>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <Route className="h-3 w-3 shrink-0" />
            <span>{timeline?.momentCount ?? moments.length} khoảnh khắc</span>
            {firstMoment && lastMoment && (
              <>
                <span>·</span>
                <span>
                  {shortDate(firstMoment.createdAt)} – {shortDate(lastMoment.createdAt)}
                </span>
              </>
            )}
          </p>
        </div>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:bg-muted hover:text-destructive"
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
        <div className="flex items-center gap-1.5 px-4 pt-1 pb-3">
          <div className="flex -space-x-1.5">
            {timeline.partners.slice(0, 5).map((p) => (
              <div
                key={p.userId}
                className="bg-muted text-muted-foreground ring-background flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold ring-2"
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
          <span className="text-muted-foreground truncate text-xs">
            Cùng: {timeline.partners.map((p) => p.userName).join(", ")}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {unavailable ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground text-sm">Dòng thời gian không khả dụng</p>
          </div>
        ) : momentsLoading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingVideo size="md" />
          </div>
        ) : moments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground text-sm">Chưa có khoảnh khắc nào</p>
          </div>
        ) : (
          <>
            <TimelineRoute moments={moments} onMomentClick={setViewMomentId} />
            <div className="flex h-16 items-center justify-center">
              {isLoadingMore && <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />}
              {!hasMore && <p className="text-muted-foreground text-xs">Đã hiển thị tất cả</p>}
            </div>
          </>
        )}
      </div>

      <MomentDetailOverlay
        momentId={viewMomentId}
        currentUserId={user?.id}
        onClose={() => setViewMomentId(null)}
        hideTimelineChip
      />
    </div>
  );
}
