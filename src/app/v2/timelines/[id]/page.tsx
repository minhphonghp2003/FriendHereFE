"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Route, MapPin, Play } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTimeline, useTimelineMoments, useDeleteTimeline } from "@/hooks/timelines";
import { LoadingVideo } from "@/components/common/loading-video";
import { MomentDetailOverlay } from "@/components/moments/moment-detail-overlay";
import { toast } from "sonner";

const PAGE_TAKE = 20;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const placeName = (loc: { isShowed: boolean; placeName: string | null; latitude: number; longitude: number } | null): string => {
  if (!loc?.isShowed) return "Không có địa điểm";
  return loc.placeName || `${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`;
};

export default function V2TimelineDetailPage() {
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
    if (!window.confirm("Xóa hành trình này? Hành động không thể hoàn tác.")) return;
    try {
      await deleteTimeline(timelineId);
      toast.success("Đã xóa hành trình");
      router.back();
    } catch {
      toast.error("Không thể xóa hành trình");
    }
  };

  const sortedMoments = [...moments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const firstMoment = sortedMoments[0];
  const lastMoment = sortedMoments[sortedMoments.length - 1];

  return (
    <div className="vt-page">
      {/* Header: back + title + delete */}
      <div className="vt-header">
        <button onClick={() => router.back()} className="vt-back" aria-label="Quay lại">
          <ArrowLeft className="vt-back-icon" />
        </button>
        <div className="vt-header-text">
          <h1 className="vt-title">{timeline?.caption ?? "Hành trình"}</h1>
          <p className="vt-subtitle">
            <Route className="vt-subtitle-icon" />
            <span>{timeline?.momentCount ?? moments.length} khoảnh khắc</span>
            {firstMoment && lastMoment && (
              <span> · {shortDate(firstMoment.createdAt)} – {shortDate(lastMoment.createdAt)}</span>
            )}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="vt-delete"
            aria-label="Xóa hành trình"
          >
            {deleting ? (
              <Loader2 className="vt-delete-icon spinning" />
            ) : (
              <Trash2 className="vt-delete-icon" />
            )}
          </button>
        )}
      </div>

      {/* Partners */}
      {timeline && timeline.partners.length > 0 && (
        <div className="vt-partners">
          <div className="vt-partners-avatars">
            {timeline.partners.slice(0, 5).map((p) => (
              <div key={p.userId} className="vt-partner-avatar">
                {p.userImage ? (
                  <img src={p.userImage.thumbUrl} alt={p.userName} className="vt-partner-img" />
                ) : (
                  p.userName.charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>
          <span className="vt-partners-text">
            Cùng: {timeline.partners.map((p) => p.userName).join(", ")}
          </span>
        </div>
      )}

      {/* Journey book */}
      <div ref={scrollRef} className="vt-scroll">
        {unavailable ? (
          <div className="vt-state">
            <p>Dòng thời gian không khả dụng</p>
          </div>
        ) : momentsLoading ? (
          <div className="vt-state">
            <LoadingVideo size="md" />
          </div>
        ) : sortedMoments.length === 0 ? (
          <div className="vt-state">
            <p>Chưa có khoảnh khắc nào</p>
          </div>
        ) : (
          <>
            {/* Journey book: alternating entries connected by a dashed path */}
            <div className="vt-book">
              {/* Cover: take-off badge */}
              <div className="vt-cover">
                <div className="vt-cover-badge">
                  <Route className="vt-cover-icon" />
                  <span>{timeline?.caption ?? "Hành trình"}</span>
                </div>
              </div>

              {sortedMoments.map((moment, index) => {
                const isLeft = index % 2 === 0;
                const isLast = index === sortedMoments.length - 1;
                const mediaUrl =
                  moment.images.length > 0
                    ? moment.images[0].originalUrl
                    : moment.video?.thumbUrl ?? null;

                return (
                  <div key={moment.id} className="vt-entry">
                    {/* Connector */}
                    {index > 0 && (
                      <div className={`vt-connector ${isLeft ? "from-left" : "from-right"}`}>
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="vt-connector-svg">
                          <path
                            d={
                              (index - 1) % 2 === 0
                                ? "M 88 0 C 88 20, 12 20, 12 40"
                                : "M 12 0 C 12 20, 88 20, 88 40"
                            }
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="3 3"
                            fill="none"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="vt-entry-row">
                      <div className={`vt-entry-card ${isLeft ? "left" : "right"}`}>
                        {/* Waypoint marker */}
                        <div className={`vt-marker ${isLeft ? "right" : "left"} ${index === 0 ? "start" : ""} ${isLast ? "end" : ""}`}>
                          {index === 0 ? "🛫" : isLast ? "🏁" : <MapPin className="vt-marker-icon" />}
                        </div>

                        <button
                          onClick={() => setViewMomentId(moment.id)}
                          className="vt-card"
                          aria-label="Xem khoảnh khắc"
                        >
                          {mediaUrl ? (
                            <img src={mediaUrl} alt="" className="vt-card-img" />
                          ) : (
                            <div className="vt-card-placeholder">?</div>
                          )}
                          <div className="vt-card-shade" />
                          {moment.video && (
                            <div className="vt-card-play">
                              <Play className="vt-card-play-icon" fill="currentColor" />
                            </div>
                          )}
                          {moment.status === "Processing" && (
                            <div className="vt-card-processing">
                              <Loader2 className="vt-card-processing-icon" />
                            </div>
                          )}
                          <div className="vt-card-top">
                            <div className="vt-card-author">
                              <div className="vt-card-avatar">
                                {moment.userImage ? (
                                  <img
                                    src={moment.userImage.thumbUrl}
                                    alt=""
                                    className="vt-card-avatar-img"
                                  />
                                ) : (
                                  moment.userName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="vt-card-author-name">{moment.userName}</span>
                            </div>
                            <span className="vt-card-time">{formatTime(moment.createdAt)}</span>
                          </div>
                          <div className="vt-card-bottom">
                            <p className="vt-card-place">
                              <MapPin className="vt-card-place-icon" />
                              <span>{placeName(moment.location)}</span>
                            </p>
                            {moment.caption && (
                              <p className="vt-card-caption">{moment.caption}</p>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="vt-footer">
              {isLoadingMore && <Loader2 className="vt-footer-icon" />}
              {!hasMore && <p>Đã hiển thị tất cả</p>}
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

      <style jsx global>{`
        .vt-page {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--vm-bg, #f4f4f5);
          color: var(--vm-text, #18181b);
        }

        .vt-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 6px;
        }

        .vt-back {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vm-surface-2, #f4f4f5);
          border: 1px solid var(--vm-border, #e4e4e7);
          border-radius: 50%;
          color: var(--vm-text, #18181b);
          cursor: pointer;
          padding: 0;
        }

        .vt-back-icon {
          width: 18px;
          height: 18px;
        }

        .vt-header-text {
          flex: 1;
          min-width: 0;
        }

        .vt-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--vm-text, #18181b);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vt-subtitle {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vt-subtitle-icon {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
        }

        .vt-delete {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          border-radius: 50%;
          color: var(--vm-text-3, #71717a);
          cursor: pointer;
          padding: 0;
        }

        .vt-delete:hover:not(:disabled) {
          background: var(--vm-surface-2, #f4f4f5);
          color: #ef4444;
        }

        .vt-delete:disabled {
          opacity: 0.5;
        }

        .vt-delete-icon {
          width: 17px;
          height: 17px;
        }

        .vt-delete-icon.spinning {
          animation: vt-spin 1s linear infinite;
        }

        @keyframes vt-spin {
          to { transform: rotate(360deg); }
        }

        .vt-partners {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 16px 10px;
        }

        .vt-partners-avatars {
          display: flex;
        }

        .vt-partner-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--vm-surface-2, #e4e4e7);
          border: 2px solid var(--vm-bg, #f4f4f5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: var(--vm-text-2, #52525b);
          margin-left: -6px;
        }

        .vt-partner-avatar:first-child {
          margin-left: 0;
        }

        .vt-partner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vt-partners-text {
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vt-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .vt-scroll::-webkit-scrollbar {
          display: none;
        }

        .vt-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--vm-text-3, #a1a1aa);
          font-size: 14px;
        }

        /* ===== Journey book ===== */
        .vt-book {
          max-width: 480px;
          margin: 0 auto;
          padding: 8px 16px 24px;
        }

        .vt-cover {
          display: flex;
          justify-content: center;
          padding: 12px 0 16px;
        }

        .vt-cover-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 999px;
          background: #2BB0AF;
          color: white;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 6px 20px rgba(43, 176, 175, 0.35);
        }

        .vt-cover-icon {
          width: 15px;
          height: 15px;
        }

        .vt-entry {
          position: relative;
        }

        .vt-connector {
          width: 100%;
          color: rgba(43, 176, 175, 0.5);
        }

        .vt-connector-svg {
          width: 100%;
          height: 36px;
          display: block;
        }

        .vt-entry-row {
          position: relative;
        }

        .vt-entry-card {
          position: relative;
          max-width: 88%;
        }

        .vt-entry-card.left { margin-right: auto; }
        .vt-entry-card.right { margin-left: auto; }

        .vt-marker {
          position: absolute;
          top: 0;
          z-index: 3;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2BB0AF;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          transform: translateY(-50%);
        }

        .vt-marker.right { right: 0; transform: translate(50%, -50%); }
        .vt-marker.left { left: 0; transform: translate(-50%, -50%); }
        .vt-marker.end { background: var(--vm-surface-2, #e4e4e7); color: var(--vm-text-2, #52525b); }

        .vt-marker-icon {
          width: 12px;
          height: 12px;
        }

        .vt-card {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: 16px;
          overflow: hidden;
          border: none;
          padding: 0;
          cursor: pointer;
          background: var(--vm-surface-2, #27272a);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
          text-align: left;
          transition: transform 0.2s;
        }

        .vt-card:hover {
          transform: scale(1.02);
        }

        .vt-card-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vt-card-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--vm-text-3, #71717a);
          font-size: 28px;
          font-weight: 800;
        }

        .vt-card-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.1) 40%, rgba(0, 0, 0, 0.35));
        }

        .vt-card-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vt-card-play-icon {
          width: 16px;
          height: 16px;
          padding-left: 2px;
        }

        .vt-card-processing {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
        }

        .vt-card-processing-icon {
          width: 22px;
          height: 22px;
          color: white;
          animation: vt-spin 1s linear infinite;
        }

        .vt-card-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 4px;
          padding: 8px;
        }

        .vt-card-author {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .vt-card-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: white;
        }

        .vt-card-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vt-card-author-name {
          font-size: 11px;
          font-weight: 600;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vt-card-time {
          flex-shrink: 0;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.4);
          color: white;
          font-size: 10px;
          font-weight: 600;
          backdrop-filter: blur(4px);
        }

        .vt-card-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 8px;
        }

        .vt-card-place {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 0;
          font-size: 11px;
          font-weight: 500;
          color: white;
        }

        .vt-card-place-icon {
          width: 11px;
          height: 11px;
          flex-shrink: 0;
        }

        .vt-card-place span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vt-card-caption {
          margin: 3px 0 0;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .vt-footer {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--vm-text-3, #a1a1aa);
          font-size: 12px;
        }

        .vt-footer-icon {
          width: 20px;
          height: 20px;
          animation: vt-spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
