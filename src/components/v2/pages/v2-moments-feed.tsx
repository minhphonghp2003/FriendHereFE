"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, SwitchCamera, ImageIcon, Loader2, Check, X, MapPin, MessageSquare, Play, Pause, Plus } from "lucide-react";
import { V2MomentReel } from "./v2-moment-reel";
import { LoadingVideo } from "@/components/common/loading-video";
import { useFeedMoments, useCreateMoment } from "@/hooks/moments";
import { useV2Modal } from "@/hooks/v2/use-v2-modal";
import { useAuth } from "@/providers/auth-provider";
import { getMyFriendships } from "@/services/friendship";
import { isAccepted, type FriendshipDto } from "@/types/friendship";
import { appHub } from "@/lib/signalr/app-hub";
import type { MomentDto, MomentVisibility } from "@/types/moment";
import { MOMENT_VISIBILITY_VALUES } from "@/types/moment";
import { toast } from "sonner";

const PAGE_TAKE = 10;
const LOAD_MORE_THRESHOLD = 3;

/** v1 chat page logic: extract the identifying file key from the event payload */
const extractFileKey = (data: unknown): string | undefined => {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  return (
    (typeof obj.originalKey === "string" ? obj.originalKey : undefined) ??
    (typeof obj.key === "string" ? obj.key : undefined) ??
    (typeof obj.fileId === "string" ? obj.fileId : undefined) ??
    undefined
  );
};

/** v1 chat page logic: compare keys by their folder prefix (strip the last
 *  path segment) so `Moment/uid/abc.jpg` matches `Moment/uid/abc_thumb.jpg` */
const normalizeKeyToken = (key: string | undefined): string => {
  if (!key) return "";
  const idx = key.lastIndexOf("/");
  return idx > 0 ? key.slice(0, idx) : key;
};

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
  onCreated: (momentId: number, fileKeys: string[]) => void;
}) {
  const { user } = useAuth();
  const { mutate: createMoment, isLoading: isUploading } = useCreateMoment();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [mode, setMode] = useState<CaptureMode>("camera");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  // Multi-image model: images[] (1..n) OR a single video
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isVideo, setIsVideo] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<MomentVisibility>("Friends");
  const [allowComment, setAllowComment] = useState(true);
  const [isShowLocation, setIsShowLocation] = useState(true);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [allFriends, setAllFriends] = useState<FriendshipDto[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);

  // Fetch ALL accepted friends once (no type filter — filtering per visibility
  // is client-side so switching is instant).
  useEffect(() => {
    getMyFriendships()
      .then((res) => setAllFriends(res.data.filter(isAccepted)))
      .catch(() => setAllFriends([]));
  }, []);

  // Filter on FE per visibility. Public can exclude ALL friends too.
  const friends = (() => {
    const type = VISIBILITY_TO_FRIEND_TYPE[visibility];
    if (type === undefined) {
      // Public (and OnlyMe): Public shows all friends; OnlyMe hides the strip
      return visibility === "Public" ? allFriends : [];
    }
    return allFriends.filter((f) => {
      const myType =
        user?.id === f.user1Id
          ? (Number(f.type1) || 0)
          : (Number(f.type2) || 0);
      return myType >= type;
    });
  })();

  // New visibility group → fresh selection (none excluded)
  useEffect(() => {
    setExcludedIds([]);
  }, [visibility]);

  const toggleExcluded = (friendUserId: number) => {
    setExcludedIds((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId],
    );
  };

  // Hide the nav button + header while composing a post (preview mode)
  useEffect(() => {
    if (mode === "preview") {
      window.dispatchEvent(new Event("v2:sheet-open"));
      window.dispatchEvent(new Event("v2:compose-open"));
    } else {
      window.dispatchEvent(new Event("v2:sheet-close"));
      window.dispatchEvent(new Event("v2:compose-close"));
    }
    return () => {
      // Ensure both are restored if the card unmounts mid-compose
      window.dispatchEvent(new Event("v2:sheet-close"));
      window.dispatchEvent(new Event("v2:compose-close"));
    };
  }, [mode]);

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

  const addMediaFiles = (files: File[]) => {
    if (files.length === 0) return;
    const video = files.find((f) => f.type.startsWith("video/"));
    if (video) {
      // A video is exclusive: exactly 1 file, replaces everything
      setMediaFiles([video]);
      setPreviewUrls([URL.createObjectURL(video)]);
      setIsVideo(true);
      setPreviewIndex(0);
    } else {
      // Append images to the current selection
      setMediaFiles((prev) => {
        const next = isVideo ? [...files] : [...prev, ...files];
        setPreviewUrls((urls) => {
          const base = isVideo ? [] : urls;
          return [...base, ...files.map((f) => URL.createObjectURL(f))];
        });
        setPreviewIndex(next.length - 1);
        return next;
      });
      setIsVideo(false);
    }
    setMode("preview");
    setShowDetails(true);
  };

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
      addMediaFiles([file]);
    }, "image/jpeg", 0.92);
  };

  const pickFromGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    addMediaFiles(files);
    // Allow re-picking the same file later
    e.target.value = "";
  };

  const reset = () => {
    // Fully tear down the preview video first — otherwise it keeps playing
    // (and holds the blob URL) after the creation box closes.
    const pv = previewVideoRef.current;
    if (pv) {
      pv.pause();
      pv.removeAttribute("src");
      pv.load();
    }
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setMediaFiles([]);
    setPreviewUrls([]);
    setPreviewIndex(0);
    setIsVideo(false);
    setIsPreviewPlaying(true);
    setCaption("");
    setAllowComment(true);
    setIsShowLocation(true);
    setExcludedIds([]);
    setShowDetails(false);
    setMode("camera");
  };

  const togglePreviewPlay = () => {
    const pv = previewVideoRef.current;
    if (!pv) return;
    if (pv.paused) {
      pv.play().catch(() => {});
    } else {
      pv.pause();
    }
  };

  const handleUpload = async () => {
    if (mediaFiles.length === 0) return;
    try {
      const { moment, fileKeys } = await createMoment({
        caption: caption.trim() || undefined,
        visibility,
        allowComment,
        isShowLocation,
        // v1: comma-joined excluded friend ids (BE attaches the live location)
        excludedUserIds: excludedIds.length > 0 ? excludedIds.join(",") : undefined,
        images: isVideo ? undefined : mediaFiles,
        video: isVideo ? mediaFiles[0] : undefined,
      });
      toast.success("Moment shared!");
      const createdId = moment.id;
      reset();
      // Report the created moment + its file keys so the feed can watch for
      // ReceiveFileMarkedSuccess (BE finished processing the media)
      onCreated(createdId, fileKeys);
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
            multiple
            onChange={pickFromGallery}
            className="cm-hidden-input"
          />

          <div className="cm-hint">Swipe up to browse moments</div>
        </>
      ) : (
        <>
          {/* Media stays full-screen on top; the options panel is a compact
              bottom sheet so the captured image/video is always visible above. */}
          {isVideo ? (
            <div className="cm-preview-wrap">
              <video
                ref={previewVideoRef}
                src={previewUrls[previewIndex] ?? undefined}
                className="cm-video"
                autoPlay
                loop
                muted
                playsInline
                onPlay={() => setIsPreviewPlaying(true)}
                onPause={() => setIsPreviewPlaying(false)}
              />
              {/* Center play/pause toggle */}
              <button
                onClick={togglePreviewPlay}
                className="cm-preview-toggle"
                aria-label={isPreviewPlaying ? "Pause" : "Play"}
              >
                {isPreviewPlaying ? (
                  <Pause className="cm-preview-toggle-icon" />
                ) : (
                  <Play className="cm-preview-toggle-icon" />
                )}
              </button>
            </div>
          ) : (
            /* Image preview: same card ratio as feed moments (9:16), rounded */
            <div className="cm-card-zone">
              <div className="cm-preview-wrap">
                <img
                  src={previewUrls[previewIndex] ?? undefined}
                  alt="New moment"
                  className="cm-video"
                />
                {/* Multi-image controls: prev/next + counter (no dots) */}
                {previewUrls.length > 1 && (
                  <>
                    <button
                      onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                      disabled={previewIndex === 0}
                      className="cm-nav-btn cm-nav-left"
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() =>
                        setPreviewIndex((i) => Math.min(previewUrls.length - 1, i + 1))
                      }
                      disabled={previewIndex === previewUrls.length - 1}
                      className="cm-nav-btn cm-nav-right"
                      aria-label="Next image"
                    >
                      ›
                    </button>
                    <span className="cm-preview-count">
                      {previewIndex + 1}/{previewUrls.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Add more images (images only) — the only per-image action; closing
              the whole compose is the X at the top-right */}
          {!isVideo && (
            <div className="cm-media-actions">
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="cm-media-action-btn"
                aria-label="Add more images"
              >
                <Plus className="cm-media-action-icon" />
              </button>
            </div>
          )}

          {/* Gallery input stays mounted in preview mode so the + button works */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={pickFromGallery}
            className="cm-hidden-input"
          />

          {/* Post details overlay */}
          {showDetails && (
            <div className="cm-details">
              {/* Close — pinned top-right of the screen, above the options
                  panel; never overlaps its content */}
              <button onClick={reset} className="cm-close-x" aria-label="Close">
                <X className="cm-close-x-icon" />
              </button>

              <div className="cm-details-bottom">
                {/* Exclude friends — visible for every visibility except OnlyMe.
                    Everyone starts INCLUDED (green); tap to exclude (red X). */}
                {visibility !== "OnlyMe" && friends.length > 0 && (
                  <div className="cm-exclude-block">
                    <span className="cm-exclude-label">
                      {excludedIds.length > 0
                        ? `Hidden from ${excludedIds.length} of ${friends.length}`
                        : `Visible to all ${friends.length}`}
                    </span>
                    <div className="cm-excluded-row">
                      {friends.map((f) => {
                        const friendUserId = user?.id === f.user1Id ? f.user2Id : f.user1Id;
                        const isExcluded = excludedIds.includes(friendUserId);
                        return (
                          <button
                            key={f.id}
                            onClick={() => toggleExcluded(friendUserId)}
                            className={`cm-friend-chip ${isExcluded ? "excluded" : "included"}`}
                            aria-label={isExcluded ? `Include ${f.otherUserName}` : `Exclude ${f.otherUserName}`}
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
                            {isExcluded ? (
                              <span className="cm-friend-mark">
                                <X className="cm-friend-mark-x" />
                              </span>
                            ) : (
                              <span className="cm-friend-mark cm-friend-mark-check">
                                <Check className="cm-friend-mark-check-icon" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                      onClick={() => setVisibility(v)}
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
                </div>

                {/* Share */}
                <button
                  onClick={handleUpload}
                  disabled={isUploading || mediaFiles.length === 0}
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

        /* Inside the fixed-ratio image card, cover fills nicely */
        .cm-card-zone img.cm-video {
          object-fit: cover;
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
          justify-content: flex-end;
          pointer-events: none;
        }

        /* Interactive elements re-enable pointer events — the media preview
           behind stays visible/untouchable-safe */
        .cm-details-bottom,
        .cm-close-x {
          pointer-events: auto;
        }

        .cm-preview-wrap {
          position: relative;
          width: 100%;
          height: 100%;
        }

        /* Image mode: the preview sits in a 9:16 rounded card (same ratio as
           feed moment items) with margins above the options panel */
        .cm-card-zone {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 8px);
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
          padding: 0 12px 14px;
          pointer-events: none;
        }

        .cm-card-zone .cm-preview-wrap {
          pointer-events: auto;
          width: 100%;
          height: auto;
          max-height: 100%;
          aspect-ratio: 9 / 16;
          align-self: center;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28);
          background: #000;
        }

        .cm-preview-toggle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 68px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          padding: 0;
          backdrop-filter: blur(6px);
          transition: transform 0.15s;
        }

        .cm-preview-toggle:active {
          transform: translate(-50%, -50%) scale(0.92);
        }

        .cm-preview-toggle-icon {
          width: 28px;
          height: 28px;
          fill: currentColor;
        }

        /* Multi-image preview controls */
        .cm-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.45);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          z-index: 3;
        }

        .cm-nav-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }

        .cm-nav-left { left: 10px; }
        .cm-nav-right { right: 10px; }

        .cm-preview-count {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 12px);
          left: 16px;
          padding: 5px 12px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.55);
          color: white;
          font-size: 11px;
          font-weight: 700;
          z-index: 3;
        }

        /* Remove / add-more buttons (image mode) */
        .cm-media-actions {
          position: absolute;
          right: 14px;
          /* Below the close button (top-right) so they never collide */
          top: calc(env(safe-area-inset-top, 0px) + 56px);
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 9;
        }

        .cm-media-action-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          padding: 0;
        }

        .cm-media-action-btn:hover {
          background: rgba(0, 0, 0, 0.75);
        }

        .cm-media-action-icon {
          width: 17px;
          height: 17px;
        }

        /* Close button — pinned at the top-right of the compose screen, above
           the options panel; never overlaps the panel content */
        .cm-close-x {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 12px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s;
          z-index: 8;
        }

        .cm-close-x:hover {
          background: rgba(0, 0, 0, 0.75);
        }

        .cm-close-x:active {
          transform: scale(0.9);
        }

        .cm-close-x-icon {
          width: 16px;
          height: 16px;
        }

        .cm-details-bottom {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px 16px calc(20px + env(safe-area-inset-bottom, 0px));
          border-radius: 20px 20px 0 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
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

        .cm-exclude-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cm-exclude-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
        }

        .cm-excluded-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 0 4px;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .cm-excluded-row::-webkit-scrollbar {
          display: none;
        }

        /* Compact avatar-only chip: green = included, red X = excluded */
        .cm-friend-chip {
          position: relative;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          padding: 0;
          border: 2px solid #22c55e;
          background: none;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .cm-friend-chip.excluded {
          border-color: #ef4444;
          opacity: 0.6;
        }

        .cm-friend-avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          overflow: hidden;
        }

        .cm-friend-initial {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          color: white;
          font-weight: 700;
          font-size: 13px;
        }

        .cm-friend-mark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.35);
          border-radius: 50%;
        }

        .cm-friend-mark-check {
          background: rgba(0, 0, 0, 0.2);
        }

        .cm-friend-mark-x {
          width: 14px;
          height: 14px;
          color: #ef4444;
          stroke-width: 3;
        }

        .cm-friend-mark-check-icon {
          width: 12px;
          height: 12px;
          color: #22c55e;
          stroke-width: 3;
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

  // v1 chat pattern: track uploaded file keys and resolve them when the BE
  // broadcasts ReceiveFileMarkedSuccess (file finished processing).
  const markedFileKeysRef = useRef<Set<string>>(new Set());
  const [pendingMoment, setPendingMoment] = useState<{ id: number; keys: string[] } | null>(null);

  useEffect(() => {
    let pendingJustResolved = false;
    const unsub = appHub.onReceiveFileMarkedSuccess((data) => {
      const fileKey = normalizeKeyToken(extractFileKey(data));
      if (!fileKey) return;
      markedFileKeysRef.current.add(fileKey);
      setPendingMoment((pending) => {
        if (!pending) return pending;
        const remaining = pending.keys.filter(
          (k) => !markedFileKeysRef.current.has(k),
        );
        if (remaining.length === 0) {
          pendingJustResolved = true;
          return null;
        }
        return { ...pending, keys: remaining };
      });
      // All files processed → refetch so the moment's status flips to Success
      if (pendingJustResolved) {
        pendingJustResolved = false;
        refetch();
      }
    });
    return unsub;
  }, [refetch]);

  /** Called by the create card after a successful upload */
  const handleMomentCreated = useCallback(
    (momentId: number, fileKeys: string[]) => {
      // Normalize both sides the same way so prefixes line up
      const marked = markedFileKeysRef.current;
      const remaining = fileKeys
        .map(normalizeKeyToken)
        .filter((k) => k && !marked.has(k));
      setPendingMoment(remaining.length > 0 ? { id: momentId, keys: remaining } : null);
      refetch();
    },
    [refetch],
  );

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const index = Math.round(el.scrollTop / el.clientHeight);
    setCurrentIndex(index);

    // Tell the nav button which reel we're on: index 0 = create card (show
    // the page toggle), index > 0 = browsing moments (nav becomes scroll-to-top)
    window.dispatchEvent(new CustomEvent("v2:moments-index", { detail: index }));

    // moments start at feed index 1 (index 0 = create card)
    const momentsSeen = Math.max(0, index); // index 1 => 1st moment visible
    if (hasMore && moments.length - momentsSeen <= LOAD_MORE_THRESHOLD) {
      loadMoreRef.current();
    }
  }, [hasMore, moments.length]);

  // Also announce the index on mount (e.g. after nav away and back)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("v2:moments-index", { detail: currentIndex }));
  }, [currentIndex]);

  // Nav button requested scroll back to the create card (index 0)
  useEffect(() => {
    const scrollTop = () => {
      containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("v2:moments-scroll-top", scrollTop);
    return () => window.removeEventListener("v2:moments-scroll-top", scrollTop);
  }, []);

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
        <CreateMomentCard onCreated={handleMomentCreated} />
      </div>

      {/* Items 2..n: moments */}
      {moments.map((moment, i) => (
        <div key={moment.id} className="v2-reel-item">
          <V2MomentReel
            moment={moment}
            currentUserId={user?.id}
            onDelete={handleDeleted}
            active={i + 1 === currentIndex}
          />
          {/* Processing badge while the BE hasn't marked this moment's file as
              ready (ReceiveFileMarkedSuccess) */}
          {pendingMoment?.id === moment.id && (
            <div className="v2-moment-processing">
              <Loader2 className="v2-moment-processing-icon" />
              <span>Processing...</span>
            </div>
          )}
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

        /* Processing overlay for freshly created moments awaiting
           ReceiveFileMarkedSuccess from the BE */
        .v2-moment-processing {
          position: absolute;
          top: calc(70px + env(safe-area-inset-top, 0px));
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.9);
          font-size: 12px;
          font-weight: 600;
          z-index: 30;
        }

        .v2-moment-processing-icon {
          width: 14px;
          height: 14px;
          animation: v2-mp-spin 1s linear infinite;
        }

        @keyframes v2-mp-spin {
          to { transform: rotate(360deg); }
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
