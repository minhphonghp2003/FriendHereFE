"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Play, Loader2, Route, ChevronRight } from "lucide-react";
import { LoadingVideo } from "@/components/common/loading-video";
import { getUserMoments } from "@/services/moment";
import { getUserTimelines } from "@/services/timeline";
import type { MomentDto } from "@/types/moment";
import type { TimelineDto } from "@/types/timeline";

const PAGE_TAKE = 10;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

const placeName = (
  loc: { isShowed: boolean; placeName: string | null; latitude: number; longitude: number } | null,
): string | null => {
  if (!loc?.isShowed) return null;
  return loc.placeName || `${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`;
};

/**
 * Compact per-user moment list: 1-column grid of SQUARE media cards with
 * caption + location overlaid at the bottom. Timeline chip (if attached)
 * navigates to the v2 timeline journey page.
 */
export function V2UserMomentList({
  userId,
  onMomentTap,
}: {
  userId: number;
  onMomentTap?: (moment: MomentDto) => void;
}) {
  const router = useRouter();
  const [moments, setMoments] = useState<MomentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const prevIdRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(
    async (prevId: number | null) => {
      const res = await getUserMoments(userId, prevId, PAGE_TAKE);
      return res;
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setMoments([]);
    setHasMore(true);
    prevIdRef.current = null;
    loadPage(null)
      .then((res) => {
        if (cancelled) return;
        setMoments(res.data);
        setHasMore(res.hasMore);
        prevIdRef.current = res.prevId;
      })
      .catch((err) => console.error("Failed to load user moments:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await loadPage(prevIdRef.current);
      setMoments((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...res.data.filter((m) => !ids.has(m.id))];
      });
      setHasMore(res.hasMore);
      prevIdRef.current = res.prevId;
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, hasMore, loadPage]);

  // Infinite scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) loadMore();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadMore]);

  if (isLoading) {
    return (
      <div className="um-list-loading">
        <LoadingVideo size="sm" />
      </div>
    );
  }

  if (moments.length === 0) {
    return <p className="um-empty">Chưa có khoảnh khắc nào</p>;
  }

  return (
    <div className="um-list" ref={listRef}>
      {moments.map((moment) => {
        const mediaUrl =
          moment.images[0]?.originalUrl ?? moment.video?.thumbUrl ?? null;
        const place = placeName(moment.location);
        return (
          <button
            key={moment.id}
            className="um-item"
            onClick={() => onMomentTap?.(moment)}
            aria-label="Xem khoảnh khắc"
          >
            <div className="um-media">
              {mediaUrl ? (
                <img src={mediaUrl} alt={moment.caption ?? ""} className="um-media-img" />
              ) : (
                <div className="um-media-placeholder">?</div>
              )}
              <div className="um-shade" />
              {moment.video && (
                <div className="um-play">
                  <Play className="um-play-icon" fill="currentColor" />
                </div>
              )}
              {moment.status === "Processing" && (
                <div className="um-processing">
                  <Loader2 className="um-processing-icon" />
                </div>
              )}
              <span className="um-date">{shortDate(moment.createdAt)}</span>

              {/* Bottom overlay: timeline chip + caption + location */}
              <div className="um-overlay">
                {moment.timeline && (
                  <span
                    className="um-timeline-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/v2/timelines/${moment.timeline!.id}`);
                    }}
                  >
                    <Route className="um-timeline-icon" />
                    <span className="um-timeline-name">{moment.timeline.caption}</span>
                    <ChevronRight className="um-timeline-chevron" />
                  </span>
                )}
                {moment.caption && <p className="um-caption">{moment.caption}</p>}
                {place && (
                  <p className="um-place">
                    <MapPin className="um-place-icon" />
                    <span>{place}</span>
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
      {isLoadingMore && (
        <div className="um-more">
          <Loader2 className="um-more-icon" />
        </div>
      )}
      {!hasMore && <p className="um-end">Đã hiển thị tất cả</p>}

      <style jsx global>{`
        .um-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 420px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-right: 2px;
        }

        .um-list::-webkit-scrollbar {
          display: none;
        }

        .um-list-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 0;
        }

        .um-empty {
          text-align: center;
          padding: 20px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
        }

        .um-item {
          display: block;
          width: 100%;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
        }

        .um-media {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          background: var(--vm-surface-2, #27272a);
        }

        .um-media-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .um-media-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 800;
          color: var(--vm-text-3, #71717a);
        }

        .um-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent 55%);
        }

        .um-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .um-play-icon {
          width: 15px;
          height: 15px;
          padding-left: 2px;
        }

        .um-processing {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
        }

        .um-processing-icon {
          width: 20px;
          height: 20px;
          color: white;
          animation: um-spin 1s linear infinite;
        }

        @keyframes um-spin {
          to { transform: rotate(360deg); }
        }

        .um-date {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.45);
          color: white;
          font-size: 10px;
          font-weight: 700;
          backdrop-filter: blur(4px);
        }

        .um-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .um-timeline-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          align-self: flex-start;
          max-width: 100%;
          padding: 4px 10px;
          border-radius: 999px;
          background: #2BB0AF;
          color: white;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          border: none;
        }

        .um-timeline-icon,
        .um-timeline-chevron {
          width: 11px;
          height: 11px;
          flex-shrink: 0;
        }

        .um-timeline-name {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .um-caption {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: white;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .um-place {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 0;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.85);
        }

        .um-place-icon {
          width: 11px;
          height: 11px;
          flex-shrink: 0;
          color: #22c55e;
        }

        .um-place span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .um-more {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        .um-more-icon {
          width: 18px;
          height: 18px;
          color: rgba(255, 255, 255, 0.5);
          animation: um-spin 1s linear infinite;
        }

        .um-end {
          text-align: center;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.35);
          margin: 8px 0 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Per-user timeline list: tile per timeline. Tap → v2 timeline journey page.
 */
export function V2UserTimelineList({ userId }: { userId: number }) {
  const router = useRouter();
  const [timelines, setTimelines] = useState<TimelineDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getUserTimelines(userId, null, PAGE_TAKE)
      .then((res) => {
        if (!cancelled) setTimelines(res.data);
      })
      .catch((err) => console.error("Failed to load user timelines:", err))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div className="utl-loading">
        <LoadingVideo size="sm" />
      </div>
    );
  }

  if (timelines.length === 0) {
    return <p className="utl-empty">Chưa có hành trình nào</p>;
  }

  return (
    <div className="utl-list">
      {timelines.map((t) => (
        <button
          key={t.id}
          className="utl-tile"
          onClick={() => router.push(`/v2/timelines/${t.id}`)}
          aria-label={`Mở hành trình ${t.caption}`}
        >
          <div className="utl-icon-wrap">
            <Route className="utl-icon" />
          </div>
          <div className="utl-info">
            <span className="utl-caption">{t.caption}</span>
            <span className="utl-sub">
              {t.momentCount} khoảnh khắc · {shortDate(t.createdAt)}
            </span>
          </div>
          <div className="utl-partners">
            {t.partners.slice(0, 3).map((p) => (
              <span key={p.userId} className="utl-partner">
                {p.userImage ? (
                  <img src={p.userImage.thumbUrl} alt={p.userName} className="utl-partner-img" />
                ) : (
                  p.userName.charAt(0).toUpperCase()
                )}
              </span>
            ))}
          </div>
          <ChevronRight className="utl-chevron" />
        </button>
      ))}

      <style jsx global>{`
        .utl-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 420px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .utl-list::-webkit-scrollbar {
          display: none;
        }

        .utl-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 0;
        }

        .utl-empty {
          text-align: center;
          padding: 20px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
        }

        .utl-tile {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s;
        }

        .utl-tile:hover {
          background: rgba(255, 255, 255, 0.09);
        }

        .utl-icon-wrap {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(43, 176, 175, 0.15);
          border: 1px solid rgba(43, 176, 175, 0.35);
          border-radius: 12px;
          color: #2BB0AF;
        }

        .utl-icon {
          width: 17px;
          height: 17px;
        }

        .utl-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .utl-caption {
          font-size: 14px;
          font-weight: 600;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .utl-sub {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .utl-partners {
          display: flex;
          flex-shrink: 0;
        }

        .utl-partner {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.1);
          border: 1.5px solid rgba(20, 20, 20, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: white;
          margin-left: -6px;
        }

        .utl-partner:first-child {
          margin-left: 0;
        }

        .utl-partner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .utl-chevron {
          width: 16px;
          height: 16px;
          color: rgba(255, 255, 255, 0.35);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
