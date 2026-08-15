"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Plus, X, Heart, MessageCircle, Share2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useFeedMoments, useCreateMoment } from "@/hooks/moments";
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
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<MomentDto | null>(null);
  const [newMomentMedia, setNewMomentMedia] = useState<File | null>(null);
  const [newMomentCaption, setNewMomentCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setShowCreateDialog(false);
      
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
                  onClick={() => setSelectedMoment(moment)}
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
        onClick={() => setShowCreateDialog(true)}
        aria-label="Create new moment"
      >
        <div className="create-btn-content">
          <Plus className="create-icon" />
        </div>
      </button>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="create-moment-dialog">
          <div className="create-dialog-content">
            <div className="create-dialog-header">
              <h2 className="create-dialog-title">New Moment</h2>
              <button
                className="close-btn"
                onClick={() => setShowCreateDialog(false)}
                aria-label="Close"
              >
                <X className="close-icon" />
              </button>
            </div>

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
        <Dialog open={!!selectedMoment} onOpenChange={() => setSelectedMoment(null)}>
          <DialogContent className="moment-detail-dialog">
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
    </div>
  );
}
