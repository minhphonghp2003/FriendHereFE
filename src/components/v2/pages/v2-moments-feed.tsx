"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, SwitchCamera, ImageIcon, Loader2, Check, X, MapPin, MessageSquare, UserX } from "lucide-react";
import { MomentCard } from "@/components/moments/moment-card";
import { LoadingVideo } from "@/components/common/loading-video";
import { useFeedMoments, useCreateMoment } from "@/hooks/moments";
import { useV2Modal } from "@/hooks/v2/use-v2-modal";
import { useAuth } from "@/providers/auth-provider";
import { getMyFriendships } from "@/services/friendship";
import { isAccepted, type FriendshipDto } from "@/types/friendship";
import type { MomentDto, MomentVisibility } from "@/types/moment";
import { MOMENT_VISIBILITY_VALUES } from "@/types/moment";
import { toast } from "sonner";

const PAGE_TAKE = 10;
const LOAD_MORE_THRESHOLD = 3;

/** v1 VISIBILITY_TO_FRIEND_TYPE: which friend groups each visibility can exclude */
const VISIBILITY_TO_FRIEND_TYPE: Partial<Record<MomentVisibility, number>> = {
  Friends: 0,
  BestFriend: 1,
  Lover: 2,
};

/** Capture mode of the create card */
type CaptureMode = "camera" | "preview";

/**
 * Item 1 of the feed: full-screen camera for creating a new moment.
 * - Live camera preview (getUserMedia, front/back switch)
 * - Capture button (photo) + tap-to-pick-from-gallery
 * - Caption + visibility, then upload via v1 useCreateMoment
 */
function CreateMomentCard({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const { mutate: createMoment, isLoading: isUploading } = useCreateMoment();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CaptureMode>("camera");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<MomentVisibility>("Friends");
  const [allowComment, setAllowComment] = useState(true);
  const [isShowLocation, setIsShowLocation] = useState(true);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [showExcluded, setShowExcluded] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // v1: friends eligible for exclusion depend on the chosen visibility
  useEffect(() => {
    const type = VISIBILITY_TO_FRIEND_TYPE[visibility];
    if (type === undefined) {
      setFriends([]);
      setExcludedIds([]);
      return;
    }
    getMyFriendships({ type })
      .then((res) => setFriends(res.data.filter(isAccepted)))
      .catch(() => setFriends([]));
  }, [visibility]);

  const toggleExcluded = (friendUserId: number) => {
    setExcludedIds((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId],
    );
  };

  // Start/stop the camera when the card enters capture mode
  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraError(null);
      } catch (err) {
        console.error("Camera access failed:", err);
        setCameraError("Camera unavailable — pick from gallery instead.");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode, facing]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `moment-${Date.now()}.jpg`, { type: "image/jpeg" });
      setMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
      setIsVideo(false);
      setMode("preview");
      setShowDetails(true);
    }, "image/jpeg", 0.92);
  };

  const pickFromGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setIsVideo(file.type.startsWith("video/"));
    setMode("preview");
    setShowDetails(true);
  };

  const reset = () => {
    setMediaFile(null);
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaPreviewUrl(null);
    setCaption("");
    setAllowComment(true);
    setIsShowLocation(true);
    setExcludedIds([]);
    setShowExcluded(false);
    setShowDetails(false);
    setMode("camera");
  };

  const handleUpload = async () => {
    if (!mediaFile) return;
    try {
      await createMoment({
        caption: caption.trim() || undefined,
        visibility,
        allowComment,
        isShowLocation,
        // v1: comma-joined excluded friend ids (BE attaches the live location)
        excludedUserIds: excludedIds.length > 0 ? excludedIds.join(",") : undefined,
        images: isVideo ? undefined : [mediaFile],
        video: isVideo ? mediaFile : undefined,
      });
      toast.success("Moment shared!");
      reset();
      onCreated();
    } catch (err) {
      console.error("Failed to create moment:", err);
      toast.error("Failed to share moment");
    }
  };

  return (
    <div className="cm-card">
      {/* Camera preview / captured media */}
      {mode === "camera" ? (
        <>
          <video ref={videoRef} className="cm-video" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="cm-canvas" />

          {cameraError && (
            <div className="cm-error">
              <p>{cameraError}</p>
            </div>
          )}

          {/* Camera controls */}
          <div className="cm-controls">
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="cm-gallery-btn"
              aria-label="Pick from gallery"
            >
              <ImageIcon className="cm-gallery-icon" />
            </button>

            <button
              onClick={capturePhoto}
              disabled={!!cameraError}
              className="cm-shutter-btn"
              aria-label="Capture photo"
            >
              <div className="cm-shutter-inner" />
            </button>

            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="cm-gallery-btn"
              aria-label="Switch camera"
            >
              <SwitchCamera className="cm-gallery-icon" />
            </button>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={pickFromGallery}
            className="cm-hidden-input"
          />

          <div className="cm-hint">Swipe up to browse moments</div>
        </>
      ) : (
        <>
          {isVideo ? (
            <video src={mediaPreviewUrl ?? undefined} className="cm-video" controls autoPlay loop muted playsInline />
          ) : (
            <img src={mediaPreviewUrl ?? undefined} alt="New moment" className="cm-video" />
          )}

          {/* Post details overlay */}
          {showDetails && (
            <div className="cm-details">
              <div className="cm-details-top">
                <button onClick={reset} className="cm-details-close" aria-label="Discard">
                  <X className="cm-details-close-icon" />
                </button>
                <span className="cm-details-title">New moment</span>
              </div>

              <div className="cm-details-bottom">
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={500}
                  className="cm-caption-input"
                />
                <div className="cm-visibility-row">
                  {(Object.keys(MOMENT_VISIBILITY_VALUES) as MomentVisibility[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setVisibility(v);
                        setExcludedIds([]);
                      }}
                      className={`cm-visibility-chip ${visibility === v ? "active" : ""}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Toggles: allow comments + show location (v1 params) */}
                <div className="cm-toggles">
                  <button
                    onClick={() => setAllowComment((v) => !v)}
                    className={`cm-toggle-chip ${allowComment ? "active" : ""}`}
                  >
                    <MessageSquare className="cm-toggle-icon" />
                    Comments
                  </button>
                  <button
                    onClick={() => setIsShowLocation((v) => !v)}
                    className={`cm-toggle-chip ${isShowLocation ? "active" : ""}`}
                  >
                    <MapPin className="cm-toggle-icon" />
                    Location
                  </button>
                  {friends.length > 0 && (
                    <button
                      onClick={() => setShowExcluded((v) => !v)}
                      className={`cm-toggle-chip ${excludedIds.length > 0 ? "alert" : ""}`}
                    >
                      <UserX className="cm-toggle-icon" />
                      {excludedIds.length > 0 ? `Exclude ${excludedIds.length}` : "Exclude"}
                    </button>
                  )}
                </div>

                {/* Excluded friends picker (v1 logic: friends of the visibility group) */}
                {showExcluded && friends.length > 0 && (
                  <div className="cm-excluded-row">
                    {friends.map((f) => {
                      const friendUserId = user?.id === f.user1Id ? f.user2Id : f.user1Id;
                      const isSelected = excludedIds.includes(friendUserId);
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleExcluded(friendUserId)}
                          className={`cm-friend-chip ${isSelected ? "excluded" : ""}`}
                        >
                          {f.otherUserImage?.thumbUrl ? (
                            <img
                              src={f.otherUserImage.thumbUrl}
                              alt={f.otherUserName}
                              className="cm-friend-avatar"
                            />
                          ) : (
                            <span className="cm-friend-avatar cm-friend-initial">
                              {f.otherUserName?.charAt(0).toUpperCase() || "?"}
                            </span>
                          )}
                          <span className="cm-friend-name">
                            {f.otherUserName.split(" ").slice(-1)[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={isUploading || !mediaFile}
                  className="cm-share-btn"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="cm-share-icon spinning" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Check className="cm-share-icon" />
                      Share
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .cm-card {
          position: relative;
          height: 100%;
          width: 100%;
          background: #000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cm-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }

        .cm-canvas {
          display: none;
        }

        .cm-error {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          background: rgba(0, 0, 0, 0.75);
          color: rgba(255, 255, 255, 0.85);
          font-size: 14px;
        }

        .cm-controls {
          position: absolute;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 40px;
        }

        .cm-shutter-btn {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          border: 4px solid white;
          background: transparent;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.15s;
        }

        .cm-shutter-btn:active {
          transform: scale(0.92);
        }

        .cm-shutter-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: white;
        }

        .cm-gallery-btn {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 14px;
          color: white;
          cursor: pointer;
          padding: 0;
        }

        .cm-gallery-icon {
          width: 20px;
          height: 20px;
        }

        .cm-hidden-input {
          display: none;
        }

        .cm-hint {
          position: absolute;
          top: calc(70px + env(safe-area-inset-top, 0px));
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          background: rgba(0, 0, 0, 0.4);
          padding: 6px 14px;
          border-radius: 12px;
          white-space: nowrap;
        }

        .cm-details {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 30%, transparent 55%, rgba(0,0,0,0.75));
        }

        .cm-details-top {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: calc(60px + env(safe-area-inset-top, 0px)) 16px 0;
        }

        .cm-details-close {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.55);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          padding: 0;
        }

        .cm-details-close-icon {
          width: 18px;
          height: 18px;
        }

        .cm-details-title {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .cm-details-bottom {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 16px calc(28px + env(safe-area-inset-bottom, 0px));
        }

        .cm-caption-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 12px 14px;
          color: white;
          font-size: 14px;
          outline: none;
          backdrop-filter: blur(10px);
        }

        .cm-caption-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .cm-visibility-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .cm-visibility-row::-webkit-scrollbar {
          display: none;
        }

        .cm-visibility-chip {
          flex-shrink: 0;
          padding: 7px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cm-visibility-chip.active {
          background: #2BB0AF;
          border-color: #2BB0AF;
          color: white;
        }

        .cm-toggles {
          display: flex;
          gap: 8px;
        }

        .cm-toggle-chip {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cm-toggle-chip.active {
          background: rgba(43, 176, 175, 0.2);
          border-color: rgba(43, 176, 175, 0.55);
          color: #2BB0AF;
        }

        .cm-toggle-chip.alert {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.45);
          color: #f87171;
        }

        .cm-toggle-icon {
          width: 14px;
          height: 14px;
        }

        .cm-excluded-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
          scrollbar-width: none;
        }

        .cm-excluded-row::-webkit-scrollbar {
          display: none;
        }

        .cm-friend-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .cm-friend-chip.excluded {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.55);
        }

        .cm-friend-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          overflow: hidden;
        }

        .cm-friend-initial {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          color: white;
          font-weight: 700;
          font-size: 16px;
        }

        .cm-friend-name {
          max-width: 56px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cm-share-btn {
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
          transition: background 0.2s;
        }

        .cm-share-btn:hover:not(:disabled) {
          background: #1a8a89;
        }

        .cm-share-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cm-share-icon {
          width: 16px;
          height: 16px;
        }

        .cm-share-icon.spinning {
          animation: cm-spin 1s linear infinite;
        }

        @keyframes cm-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * TikTok/Reels-style vertical snap feed.
 * Item 1 = create-moment camera card; items 2..n = fullscreen moments.
 */
export function V2MomentsFeed() {
  const { user } = useAuth();
  const {
    data: moments,
    isLoading,
    refetch,
    loadMore,
    hasMore,
  } = useFeedMoments(PAGE_TAKE);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    setCurrentIndex(index);

    // moments start at feed index 1 (index 0 = create card)
    const momentsSeen = Math.max(0, index); // index 1 => 1st moment visible
    if (hasMore && moments.length - momentsSeen <= LOAD_MORE_THRESHOLD) {
      loadMoreRef.current();
    }
  }, [hasMore, moments.length]);

  const handleToggleInfo = useCallback(() => setShowInfo((v) => !v), []);

  const handleDeleted = useCallback(
    (id: number) => {
      refetch();
    },
    [refetch],
  );

  return (
    <div className="v2-reels-container" ref={containerRef} onScroll={handleScroll}>
      {/* Item 1: create moment camera */}
      <div className="v2-reel-item">
        <CreateMomentCard onCreated={() => refetch()} />
      </div>

      {/* Items 2..n: moments */}
      {moments.map((moment, i) => (
        <div key={moment.id} className="v2-reel-item">
          <MomentCard
            fullscreen
            moment={moment}
            currentUserId={user?.id}
            onDelete={handleDeleted}
            active={i + 1 === currentIndex}
            showInfo={showInfo}
            onToggleInfo={handleToggleInfo}
          />
        </div>
      ))}

      {/* Loading + end states */}
      {isLoading && moments.length === 0 && (
        <div className="v2-reel-item">
          <div className="v2-reels-loading">
            <LoadingVideo size="md" />
          </div>
        </div>
      )}
      {!isLoading && moments.length === 0 && (
        <div className="v2-reel-item">
          <div className="v2-reels-empty">
            <p>No moments yet</p>
            <span>Capture one with the camera above</span>
          </div>
        </div>
      )}
      {!hasMore && moments.length > 0 && (
        <div className="v2-reels-end">Đã hiển thị tất cả</div>
      )}

      <style jsx global>{`
        .v2-reels-container {
          height: 100%;
          width: 100%;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          background: #000;
        }

        .v2-reels-container::-webkit-scrollbar {
          display: none;
        }

        .v2-reel-item {
          height: 100%;
          width: 100%;
          flex-shrink: 0;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          position: relative;
        }

        .v2-reels-loading,
        .v2-reels-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
        }

        .v2-reels-empty p {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .v2-reels-empty span {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
        }

        .v2-reels-end {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          scroll-snap-align: start;
        }
      `}</style>
    </div>
  );
}
