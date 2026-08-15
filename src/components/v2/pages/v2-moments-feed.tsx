"use client";

import { useState, useRef } from "react";
import { Camera, Plus, X, Heart, MessageCircle, Share2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMoments, type Moment } from "@/hooks/use-moments";
import { toast } from "sonner";

export function V2MomentsFeed() {
  const { moments, isLoading, getMoments, createMoment, likeMoment } = useMoments();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [newMomentMedia, setNewMomentMedia] = useState<File | null>(null);
  const [newMomentCaption, setNewMomentCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setIsUploading(true);
      
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleLikeMoment = async (momentId: number) => {
    try {
      await likeMoment(momentId);
    } catch (error) {
      console.error("Failed to like moment:", error);
      toast.error("Failed to like moment");
    }
  };

  return (
    <div className="v2-moments-container">
      {/* Header */}
      <div className="moments-header">
        <h1 className="moments-title">Moments</h1>
        <div className="moments-header-actions">
          <span className="moments-count">{moments.length}</span>
        </div>
      </div>

      {/* Moments Grid */}
      <div className="moments-content">
        {isLoading ? (
          <div className="moments-loading">
            <div className="loading-spinner" />
            <p className="loading-text">Loading moments...</p>
          </div>
        ) : moments.length > 0 ? (
          <div className="moments-grid">
            {moments.map((moment) => (
              <div
                key={moment.id}
                className="moment-card"
                onClick={() => setSelectedMoment(moment)}
              >
                <div className="moment-media">
                  {moment.mediaType === "image" ? (
                    <img
                      src={moment.mediaUrl}
                      alt={moment.caption || "Moment"}
                      className="moment-image"
                    />
                  ) : (
                    <video
                      src={moment.mediaUrl}
                      className="moment-video"
                      muted
                      loop
                      playsInline
                    />
                  )}
                  
                  <div className="moment-user-overlay">
                    <span className="moment-user-initial">
                      {moment.userName?.charAt(0) || "?"}
                    </span>
                  </div>

                  <div className="moment-stats">
                    {moment.isLiked && (
                      <div className="moment-stat-item liked">
                        <Heart className="moment-stat-icon" fill="white" />
                      </div>
                    )}
                    {(moment.comments || 0) > 0 && (
                      <div className="moment-stat-item">
                        <MessageCircle className="moment-stat-icon" />
                        <span>{moment.comments}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
                  disabled={!newMomentMedia || isUploading}
                  className="submit-btn"
                >
                  {isUploading ? "Sharing..." : "Share Moment"}
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
                {selectedMoment.mediaType === "image" ? (
                  <img
                    src={selectedMoment.mediaUrl}
                    alt={selectedMoment.caption || "Moment"}
                    className="detail-image"
                  />
                ) : (
                  <video
                    src={selectedMoment.mediaUrl}
                    className="detail-video"
                    controls
                    autoPlay
                  />
                )}
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
                  <button
                    className="detail-action-btn"
                    onClick={() => handleLikeMoment(selectedMoment.id)}
                    aria-label="Like moment"
                  >
                    <Heart
                      className={cn(
                        "action-icon",
                        selectedMoment.isLiked && "liked"
                      )}
                      fill={selectedMoment.isLiked ? "white" : "none"}
                    />
                    <span>{selectedMoment.likes || 0}</span>
                  </button>

                  <button
                    className="detail-action-btn"
                    aria-label="Comment"
                  >
                    <MessageCircle className="action-icon" />
                    <span>{selectedMoment.comments || 0}</span>
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