"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Plus, Heart, MessageCircle, Share2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useFeedMoments, useCreateMoment } from "@/hooks/moments";
import { useV2Modal } from "@/hooks/v2/use-v2-modal";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import type { MomentDto } from "@/types/moment";

export function V2MomentsFeed() {
  const { user } = useAuth();
  const {
    data: moments,
    isLoading,
    refetch: getMoments,
    loadMore,
    hasMore,
  } = useFeedMoments(10);
  const { mutate: createMoment, isLoading: isCreating } = useCreateMoment();
  
  const createModal = useV2Modal("moments-create");
  const detailModal = useV2Modal("moments-detail");
  const [selectedMoment, setSelectedMoment] = useState<MomentDto | null>(null);
  const [newMomentMedia, setNewMomentMedia] = useState<File | null>(null);
  const [newMomentCaption, setNewMomentCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openCreateDialog = () => {
    createModal.open();
  };

  const openMomentDetail = (moment: MomentDto) => {
    setSelectedMoment(moment);
    detailModal.open();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMomentMedia(file);
    }
  };

  const handleCreateMoment = async () => {
    if (!newMomentMedia) {
      toast.error("Please select a photo or video");
      return;
    }

    try {
      const isVideo = newMomentMedia.type.startsWith("video/");
      await createMoment({
        caption: newMomentCaption || undefined,
        visibility: "Friends",
        allowComment: true,
        isShowLocation: false,
        images: isVideo ? undefined : [newMomentMedia],
        video: isVideo ? newMomentMedia : undefined,
      });
      
      setNewMomentMedia(null);
      setNewMomentCaption("");
      createModal.close();
      
      // Reload moments
      await getMoments();
      
      toast.success("Moment created successfully!");
    } catch (error) {
      console.error("Failed to create moment:", error);
      toast.error("Failed to create moment");
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !hasMore || isLoading) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  const getMomentMedia = (moment: MomentDto) => {
    if (moment.video?.originalUrl) {
      return {
        type: "video" as const,
        url: moment.video.originalUrl,
      };
    }
    if (moment.images[0]?.originalUrl) {
      return {
        type: "image" as const,
        url: moment.images[0].originalUrl,
      };
    }
    return null;
  };

  const getMomentStats = (moment: MomentDto) => {
    const reactions = moment.reactions?.length ?? 0;
    const isLiked = moment.reactions?.some((r) => r.userId === user?.id) ?? false;
    return { reactions, isLiked };
  };

  return (
    <div className="v2-moments-container" ref={scrollRef} onScroll={handleScroll}>
      {/* Header */}
      <div className="moments-header">
        <h1 className="moments-title">Moments</h1>
        <div className="moments-header-actions">
          <span className="moments-count">{moments.length}</span>
        </div>
      </div>

      {/* Moments Grid */}
      <div className="moments-content">
        {isLoading && moments.length === 0 ? (
          <div className="moments-loading">
            <div className="loading-spinner" />
            <p className="loading-text">Loading moments...</p>
          </div>
        ) : moments.length > 0 ? (
          <div className="moments-grid">
            {moments.map((moment) => {
              const media = getMomentMedia(moment);
              if (!media) return null;
              
              const stats = getMomentStats(moment);
              const initials = moment.userName?.charAt(0) || "?";
              
              return (
                <div
                  key={moment.id}
                  className="moment-card"
                  onClick={() => openMomentDetail(moment)}
                >
                  <div className="moment-media">
                    {media.type === "image" ? (
                      <img
                        src={media.url}
                        alt={moment.caption || "Moment"}
                        className="moment-image"
                      />
                    ) : (
                      <video
                        src={media.url}
                        className="moment-video"
                        muted
                        loop
                        playsInline
                      />
                    )}
                    
                    <div className="moment-user-overlay">
                      <span className="moment-user-initial">{initials}</span>
                    </div>

                    <div className="moment-stats">
                      {stats.isLiked && (
                        <div className="moment-stat-item liked">
                          <Heart className="moment-stat-icon" fill="white" />
                        </div>
                      )}
                      {stats.reactions > 0 && (
                        <div className="moment-stat-item">
                          <span>{stats.reactions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="moments-empty">
            <Camera className="empty-icon" />
            <h3 className="empty-title">No moments yet</h3>
            <p className="empty-description">
              Be the first to share a moment with your friends
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className="create-moment-btn"
        onClick={openCreateDialog}
        aria-label="Create new moment"
      >
        <div className="create-btn-content">
          <Plus className="create-icon" />
        </div>
      </button>

      {/* Create Dialog */}
      <Dialog open={createModal.isOpen} onOpenChange={(open) => !open && createModal.close()}>
        <DialogContent className="create-moment-dialog v2-native-sheet" showCloseButton={false}>
          <div className="create-dialog-content">
            <div className="create-dialog-body">
              <div className="media-preview">
                {newMomentMedia ? (
                  newMomentMedia.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(newMomentMedia)}
                      alt="Preview"
                      className="preview-image"
                    />
                  ) : (
                    <video
                      src={URL.createObjectURL(newMomentMedia)}
                      className="preview-video"
                      controls
                    />
                  )
                ) : (
                  <div className="preview-placeholder">
                    <Camera className="placeholder-icon" />
                    <p className="placeholder-text">
                      Add a photo or video
                    </p>
                  </div>
                )}
              </div>

              <div className="caption-section">
                <Textarea
                  placeholder="Add a caption..."
                  value={newMomentCaption}
                  onChange={(e) => setNewMomentCaption(e.target.value)}
                  className="caption-input"
                  maxLength={500}
                  rows={3}
                />
                <p className="caption-counter">
                  {newMomentCaption.length}/500
                </p>
              </div>

              <div className="create-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden-file-input"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="select-media-btn"
                >
                  {newMomentMedia ? "Change Media" : "Select Media"}
                </Button>

                <Button
                  onClick={handleCreateMoment}
                  disabled={!newMomentMedia || isCreating}
                  className="submit-btn"
                >
                  {isCreating ? "Sharing..." : "Share Moment"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Moment Detail Modal */}
      {selectedMoment && (
        <Dialog open={detailModal.isOpen && !!selectedMoment} onOpenChange={(open) => !open && detailModal.close()}>
          <DialogContent className="moment-detail-dialog" showCloseButton={false}>
            <div className="moment-detail-content">
              <div className="detail-media">
                {(() => {
                  const media = getMomentMedia(selectedMoment);
                  if (!media) return null;
                  return media.type === "image" ? (
                    <img
                      src={media.url}
                      alt={selectedMoment.caption || "Moment"}
                      className="detail-image"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="detail-video"
                      controls
                      autoPlay
                    />
                  );
                })()}
              </div>

              <div className="detail-info">
                <div className="detail-user">
                  <div className="detail-user-avatar">
                    {selectedMoment.userName?.charAt(0) || "?"}
                  </div>
                  <div className="detail-user-details">
                    <h3 className="detail-user-name">{selectedMoment.userName}</h3>
                    <p className="detail-time">
                      {new Date(selectedMoment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedMoment.caption && (
                  <p className="detail-caption">{selectedMoment.caption}</p>
                )}

                <div className="detail-actions">
                  <div className="detail-action-btn">
                    <Heart
                      className={cn(
                        "action-icon",
                        getMomentStats(selectedMoment).isLiked && "liked"
                      )}
                      fill={getMomentStats(selectedMoment).isLiked ? "white" : "none"}
                    />
                    <span>{getMomentStats(selectedMoment).reactions}</span>
                  </div>

                  <button
                    className="detail-action-btn"
                    aria-label="Comment"
                  >
                    <MessageCircle className="action-icon" />
                  </button>

                  <button
                    className="detail-action-btn"
                    aria-label="Share"
                  >
                    <Share2 className="action-icon" />
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <style jsx global>{`
        .v2-moments-container {
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-top: calc(56px + env(safe-area-inset-top, 0px));
        }

        .v2-moments-container::-webkit-scrollbar {
          display: none;
        }

        .moments-header {
          padding: 16px 20px 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .moments-title {
          font-size: 22px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .moments-count {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .moments-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          padding: 4px;
        }

        .moment-card {
          aspect-ratio: 9/16;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .moment-card:active {
          transform: scale(0.98);
        }

        .moment-media {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .moment-image,
        .moment-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .moment-user-overlay {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 10;
        }

        .moment-user-initial {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          color: white;
          font-weight: 600;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .moment-stats {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 10;
        }

        .moment-stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          padding: 3px 7px;
          border-radius: 10px;
          font-size: 11px;
          color: white;
          font-weight: 500;
        }

        .moment-stat-item.liked {
          background: rgba(239, 68, 68, 0.75);
        }

        .moment-stat-icon {
          width: 11px;
          height: 11px;
        }

        .moments-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: white;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: v2-spin 1s linear infinite;
        }

        @keyframes v2-spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          margin-top: 12px;
          font-size: 13px;
          opacity: 0.7;
        }

        .moments-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          text-align: center;
          padding: 40px 20px;
        }

        .moments-empty .empty-icon {
          width: 56px;
          height: 56px;
          color: rgba(255, 255, 255, 0.25);
          margin-bottom: 16px;
        }

        .moments-empty .empty-title {
          font-size: 17px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 6px 0;
        }

        .moments-empty .empty-description {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          margin: 0;
        }

        /* Create FAB */
        .create-moment-btn {
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b6b, #ff8e53);
          border: none;
          box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
          cursor: pointer;
          z-index: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .create-moment-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(255, 107, 107, 0.5);
        }

        .create-moment-btn:active {
          transform: scale(0.95);
        }

        .create-btn-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .create-icon {
          width: 24px;
          height: 24px;
          color: white;
        }

        /* Native bottom-sheet style dialogs */
        .create-moment-dialog,
        .moment-detail-dialog {
          background: rgba(15, 15, 15, 0.97) !important;
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 24px 24px 0 0 !important;
          border-bottom: none !important;
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          max-height: 92dvh;
          margin: 0 !important;
          position: fixed !important;
          bottom: 0 !important;
          top: auto !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          overflow: hidden;
          animation: v2-sheet-up 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        }

        .create-moment-dialog::before,
        .moment-detail-dialog::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          z-index: 10;
        }

        .create-dialog-content {
          padding: 28px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        }

        .create-dialog-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .media-preview {
          width: 100%;
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-image,
        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
        }

        .placeholder-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 10px;
        }

        .placeholder-text {
          font-size: 14px;
          margin: 0;
        }

        .caption-section {
          display: flex;
          flex-direction: column;
        }

        .caption-input {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: white;
          resize: none;
          border-radius: 12px;
        }

        .caption-counter {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          text-align: right;
          margin-top: 6px;
        }

        .create-actions {
          display: flex;
          gap: 12px;
        }

        .create-actions button {
          flex: 1;
        }

        .hidden-file-input {
          display: none;
        }

        /* Moment detail */
        .moment-detail-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 28px 20px calc(20px + env(safe-area-inset-bottom, 0px));
        }

        .detail-media {
          width: 100%;
          aspect-ratio: 9/16;
          background: black;
          border-radius: 16px;
          overflow: hidden;
        }

        .detail-image,
        .detail-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .detail-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .detail-user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          flex-shrink: 0;
        }

        .detail-user-name {
          font-size: 15px;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .detail-time {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
          margin: 2px 0 0 0;
        }

        .detail-caption {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
          margin: 0;
        }

        .detail-actions {
          display: flex;
          gap: 20px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .detail-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 10px;
          transition: background 0.2s ease;
          font-size: 14px;
        }

        .detail-action-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .action-icon {
          width: 20px;
          height: 20px;
        }

        .action-icon.liked {
          color: #ff6b6b;
        }

        @keyframes v2-sheet-up {
          from {
            transform: translateX(-50%) translateY(100%);
          }
          to {
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
