"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Play, Loader2, Route, ChevronRight, Plus, Check, CalendarDays, X } from "lucide-react";
import { LoadingVideo } from "@/components/common/loading-video";
import { getUserMoments, getMomentThumbnail, getAvailableMoments } from "@/services/moment";
import { getUserTimelines, getMyTimelines, createTimeline as createTimelineService } from "@/services/timeline";
import { getMyFriendships } from "@/services/friendship";
import { isAccepted, type FriendshipDto } from "@/types/friendship";
import { useAppSelector } from "@/store/hooks";
import { V2MomentViewer } from "@/components/v2/pages/v2-moment-viewer";
import type { MomentDto } from "@/types/moment";
import type { TimelineDto } from "@/types/timeline";
import { toast } from "sonner";

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
  const { user: currentUser } = useAuthSafe();
  const [moments, setMoments] = useState<MomentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // v2 fullscreen viewer state
  const [viewMoment, setViewMoment] = useState<MomentDto | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
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
            onClick={() => {
              setViewMoment(moment);
              setViewIndex(0);
            }}
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
          /* No fixed max-height: flows naturally inside the sheet's scrollable
             content column so nothing gets cut off */
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
      `}</style>

      {/* Same fullscreen viewer component as the moment feed */}
      {viewMoment && (
        <V2MomentViewer
          moment={viewMoment}
          initialIndex={viewIndex}
          onClose={() => setViewMoment(null)}
        />
      )}
    </div>
  );
}

/**
 * Per-user timeline list: tile per timeline. Tap → v2 timeline journey page.
 */
export function V2UserTimelineList({ userId }: { userId: number }) {
  const router = useRouter();
  const { user: currentUser } = useAuthSafe();
  const isMe = currentUser?.id === userId;
  const [timelines, setTimelines] = useState<TimelineDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchTimelines = useCallback(() => {
    setIsLoading(true);
    // Own profile ? dedicated my-timelines API; other users ? user-timelines API
    const fetcher = isMe
      ? getMyTimelines(null, PAGE_TAKE)
      : getUserTimelines(userId, null, PAGE_TAKE);
    fetcher
      .then((res) => setTimelines(res.data))
      .catch((err) => console.error("Failed to load user timelines:", err))
      .finally(() => setIsLoading(false));
  }, [userId, isMe]);

  useEffect(() => {
    fetchTimelines();
  }, [fetchTimelines]);

  return (
    <div className="utl-wrap">
      {/* Create button — v1 create flow (caption, date range, pick moments, partners) */}
      <button className="utl-create-btn" onClick={() => setShowCreate(true)}>
        <Plus className="utl-create-icon" />
        <span>Tạo hành trình</span>
      </button>

      {isLoading ? (
        <div className="utl-loading">
          <LoadingVideo size="sm" />
        </div>
      ) : timelines.length === 0 ? (
        <p className="utl-empty">Chưa có hành trình nào</p>
      ) : (
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
        </div>
      )}

      {showCreate && (
        <V2CreateTimeline
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchTimelines();
          }}
        />
      )}

      <style jsx global>{`
        .utl-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .utl-create-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          padding: 11px;
          border: 1px dashed rgba(43, 176, 175, 0.5);
          border-radius: 14px;
          background: rgba(43, 176, 175, 0.08);
          color: #2BB0AF;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .utl-create-btn:hover {
          background: rgba(43, 176, 175, 0.15);
        }

        .utl-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
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

/**
 * Create timeline (v1 CreateTimelineDialog logic, v2 styling):
 * caption + date range → available moments (paginated) + partners → create.
 */
function V2CreateTimeline({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuthSafe();
  const [caption, setCaption] = useState("");
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [partnerIds, setPartnerIds] = useState<number[]>([]);
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [available, setAvailable] = useState<MomentDto[]>([]);
  const [loadingMoments, setLoadingMoments] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRange = !!fromDate && !!toDate && fromDate <= toDate;

  // v1: friends for partner selection
  useEffect(() => {
    getMyFriendships({ take: 100 })
      .then((res) => setFriends(res.data.filter(isAccepted)))
      .catch(() => {});
  }, []);

  // v1: available moments in the selected date range (getAvailableMoments)
  useEffect(() => {
    if (!hasRange) {
      setAvailable([]);
      return;
    }
    let cancelled = false;
    setLoadingMoments(true);
    getAvailableMoments(`${fromDate}T00:00:00Z`, `${toDate}T23:59:59Z`, null, 50)
      .then((res) => {
        if (!cancelled) setAvailable(res.data);
      })
      .catch(() => {
        if (!cancelled) setAvailable([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMoments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate, hasRange]);

  const toggleMoment = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const togglePartner = (id: number) =>
    setPartnerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () => {
    if (available.length > 0 && selectedIds.length === available.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(available.map((m) => m.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError("Vui lòng chọn ít nhất một khoảnh khắc.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      await createTimelineService({
        caption: caption.trim(),
        partnerIds,
        momentIds: selectedIds,
      });
      toast.success("Đã tạo hành trình!");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo hành trình thất bại");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="utc-sheet">
      <div className="utc-backdrop" onClick={onClose} aria-hidden />

      <div className="utc-panel">
        <div className="utc-grabber" />
        <div className="utc-head">
          <h3 className="utc-title">
            <Route className="utc-title-icon" />
            Tạo hành trình
          </h3>
          <button onClick={onClose} className="utc-close" aria-label="Đóng">
            <X className="utc-close-icon" />
          </button>
        </div>

        <div className="utc-body">
          <div className="utc-field">
            <label className="utc-label" htmlFor="utc-caption">Tiêu đề</label>
            <input
              id="utc-caption"
              className="utc-input"
              placeholder="VD: Chuyến đi mùa hè"
              value={caption}
              maxLength={100}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="utc-field">
            <label className="utc-label">
              <CalendarDays className="utc-label-icon" />
              Khoảng thời gian
            </label>
            <div className="utc-range">
              <input
                type="date"
                className="utc-input"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="utc-arrow">→</span>
              <input
                type="date"
                className="utc-input"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="utc-field">
            <div className="utc-label-row">
              <label className="utc-label">Chọn khoảnh khắc</label>
              {available.length > 0 && (
                <button className="utc-select-all" onClick={toggleAll}>
                  {selectedIds.length === available.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              )}
            </div>

            {!hasRange ? (
              <p className="utc-hint">Chọn khoảng thời gian</p>
            ) : loadingMoments ? (
              <div className="utc-moments-loading">
                <LoadingVideo size="sm" />
              </div>
            ) : available.length === 0 ? (
              <p className="utc-hint">Không có khoảnh khắc khả dụng trong khoảng này</p>
            ) : (
              <div className="utc-moments">
                {available.map((moment) => {
                  const thumb = getMomentThumbnail(moment);
                  const selected = selectedIds.includes(moment.id);
                  return (
                    <button
                      key={moment.id}
                      className={`utc-moment ${selected ? "selected" : ""}`}
                      onClick={() => toggleMoment(moment.id)}
                    >
                      <div className="utc-moment-thumb">
                        {thumb ? (
                          <img src={thumb.thumbUrl} alt="" className="utc-moment-img" />
                        ) : (
                          <span className="utc-moment-placeholder">?</span>
                        )}
                      </div>
                      <div className="utc-moment-info">
                        <span className="utc-moment-caption">
                          {moment.caption || "Không có chú thích"}
                        </span>
                        <span className="utc-moment-sub">
                          {moment.location?.isShowed && (
                            <>
                              <MapPin className="utc-moment-pin" />
                              {moment.location.placeName ||
                                `${moment.location.latitude.toFixed(3)}, ${moment.location.longitude.toFixed(3)}`}
                              {" · "}
                            </>
                          )}
                          {new Date(moment.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <span className={`utc-check ${selected ? "on" : ""}`}>
                        {selected && <Check className="utc-check-icon" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="utc-field">
            <label className="utc-label">Bạn đồng hành</label>
            {friends.length === 0 ? (
              <p className="utc-hint">Chưa có bạn bè</p>
            ) : (
              <div className="utc-partners-row">
                {friends.map((f) => {
                  const friendUserId = user?.id === f.user1Id ? f.user2Id : f.user1Id;
                  const selected = partnerIds.includes(friendUserId);
                  return (
                    <button
                      key={f.id}
                      className={`utc-partner ${selected ? "selected" : ""}`}
                      onClick={() => togglePartner(friendUserId)}
                    >
                      <span className="utc-partner-avatar">
                        {f.otherUserImage?.thumbUrl ? (
                          <img src={f.otherUserImage.thumbUrl} alt="" className="utc-partner-img" />
                        ) : (
                          f.otherUserName.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="utc-partner-name">{f.otherUserName.split(" ").slice(-1)[0]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="utc-error">{error}</p>}

          <button
            className="utc-submit"
            onClick={handleSubmit}
            disabled={creating || selectedIds.length === 0}
          >
            {creating ? (
              <>
                <Loader2 className="utc-submit-icon spinning" />
                Đang tạo...
              </>
            ) : (
              <>
                <Check className="utc-submit-icon" />
                Tạo ({selectedIds.length})
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .utc-sheet {
          position: fixed;
          inset: 0;
          z-index: 3400;
        }

        .utc-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .utc-panel {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          top: env(safe-area-inset-top, 0px);
          background: rgba(15, 15, 15, 0.98);
          backdrop-filter: blur(24px);
          border-radius: 24px 24px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          animation: utc-up 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }

        @keyframes utc-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .utc-grabber {
          width: 42px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          margin: 10px auto 4px;
          flex-shrink: 0;
        }

        .utc-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px 10px;
          flex-shrink: 0;
        }

        .utc-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: white;
        }

        .utc-title-icon {
          width: 17px;
          height: 17px;
          color: #2BB0AF;
        }

        .utc-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          padding: 0;
        }

        .utc-close-icon {
          width: 16px;
          height: 16px;
        }

        .utc-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 0 16px calc(20px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .utc-body::-webkit-scrollbar {
          display: none;
        }

        .utc-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .utc-label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.55);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .utc-label-icon {
          width: 13px;
          height: 13px;
        }

        .utc-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .utc-select-all {
          background: none;
          border: none;
          color: #2BB0AF;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }

        .utc-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          padding: 11px 14px;
          color: white;
          font-size: 14px;
          outline: none;
        }

        .utc-input:focus {
          border-color: rgba(43, 176, 175, 0.55);
        }

        .utc-range {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .utc-arrow {
          color: rgba(255, 255, 255, 0.4);
          font-size: 13px;
        }

        .utc-hint {
          text-align: center;
          padding: 18px 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }

        .utc-moments-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 0;
        }

        .utc-moments {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .utc-moment {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .utc-moment.selected {
          background: rgba(43, 176, 175, 0.12);
          border-color: rgba(43, 176, 175, 0.5);
        }

        .utc-moment-thumb {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }

        .utc-moment-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .utc-moment-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          font-weight: 800;
        }

        .utc-moment-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .utc-moment-caption {
          font-size: 13px;
          font-weight: 600;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .utc-moment-sub {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .utc-moment-pin {
          width: 10px;
          height: 10px;
          flex-shrink: 0;
          color: #22c55e;
        }

        .utc-check {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .utc-check.on {
          background: #2BB0AF;
          border-color: #2BB0AF;
          color: white;
        }

        .utc-check-icon {
          width: 13px;
          height: 13px;
        }

        .utc-partners-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0 4px;
          scrollbar-width: none;
        }

        .utc-partners-row::-webkit-scrollbar {
          display: none;
        }

        .utc-partner {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .utc-partner.selected {
          background: rgba(43, 176, 175, 0.15);
          border-color: rgba(43, 176, 175, 0.5);
        }

        .utc-partner-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          color: white;
        }

        .utc-partner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .utc-partner-name {
          max-width: 56px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.6);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .utc-error {
          margin: 0;
          font-size: 13px;
          color: #ef4444;
        }

        .utc-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 14px;
          background: #2BB0AF;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .utc-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .utc-submit-icon {
          width: 16px;
          height: 16px;
        }

        .utc-submit-icon.spinning {
          animation: utc-spin 1s linear infinite;
        }

        @keyframes utc-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/** Current user straight from the auth slice (no provider dependency) */
function useAuthSafe() {
  const user = useAppSelector((s) => s.auth.user);
  return { user };
}

function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
