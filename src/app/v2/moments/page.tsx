"use client";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Camera, Plus, X, Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignalRProvider } from "@/providers/signalr-provider";
import { useMoments } from "@/hooks/use-moments";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Moment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  createdAt: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
}

export default function V2MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [newMomentMedia, setNewMomentMedia] = useState<File | null>(null);
  const [newMomentCaption, setNewMomentCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const { getMoments, createMoment, likeMoment } = useMoments();

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    try {
      setIsLoading(true);
      const data = await getMoments();
      setMoments(data);
    } catch (error) {
      console.error("Failed to load moments:", error);
      toast.error("Failed to load moments");
    } finally {
      setIsLoading(false);
    }
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
      setIsUploading(true);
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append("file", newMomentMedia);
      formData.append("caption", newMomentCaption);
      
      await createMoment(formData);
      
      // Reset form
      setNewMomentMedia(null);
      setNewMomentCaption("");
      setShowCreateDialog(false);
      
      // Reload moments
      await loadMoments();
      
      toast.success("Moment created successfully!");
    } catch (error) {
      console.error("Failed to create moment:", error);
      toast.error("Failed to create moment");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLikeMoment = async (momentId: string) => {
    try {
      await likeMoment(momentId);
      setMoments(prev => prev.map(moment => 
        moment.id === momentId 
          ? { 
              ...moment, 
              isLiked: !moment.isLiked,
              likes: (moment.likes || 0) + (moment.isLiked ? -1 : 1)
            }
          : moment
      ));
    } catch (error) {
      console.error("Failed to like moment:", error);
      toast.error("Failed to like moment");
    }
  };

  return (
    <SignalRProvider>
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
                    
                    {/* User overlay */}
                    <div className="moment-user-overlay">
                      <div className="moment-user-avatar">
                        {moment.userAvatar ? (
                          <img
                            src={moment.userAvatar}
                            alt={moment.userName}
                            className="user-avatar-img"
                          />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {moment.userName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="moment-user-name">{moment.userName}</span>
                    </div>

                    {/* Stats overlay */}
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
                {/* Media Preview */}
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

                {/* Caption Input */}
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

                {/* Action Buttons */}
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
                      {selectedMoment.userAvatar ? (
                        <img
                          src={selectedMoment.userAvatar}
                          alt={selectedMoment.userName}
                          className="detail-user-avatar-img"
                        />
                      ) : (
                        <div className="detail-user-avatar-placeholder">
                          {selectedMoment.userName.charAt(0)}
                        </div>
                      )}
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

        <style jsx global>{`
          .v2-moments-container {
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            flex-direction: column;
            position: relative;
          }

          /* Header */
          .moments-header {
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 100;
          }

          .moments-title {
            font-size: 24px;
            font-weight: 700;
            color: white;
            margin: 0;
          }

          .moments-count {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
          }

          /* Content */
          .moments-content {
            flex: 1;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: 4px;
          }

          .moments-content::-webkit-scrollbar {
            display: none;
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
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .loading-text {
            margin-top: 12px;
            font-size: 14px;
            opacity: 0.7;
          }

          /* Moments Grid */
          .moments-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 4px;
            padding: 4px;
          }

          .moment-card {
            aspect-ratio: 9/16;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
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

          .moment-video {
            background: black;
          }

          /* User overlay */
          .moment-user-overlay {
            position: absolute;
            top: 8px;
            left: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            z-index: 10;
          }

          .moment-user-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid rgba(0, 0, 0, 0.3);
          }

          .user-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .user-avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            font-weight: 600;
            font-size: 12px;
          }

          .moment-user-name {
            font-size: 12px;
            font-weight: 600;
            color: white;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
          }

          /* Stats overlay */
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
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            color: white;
            font-weight: 500;
          }

          .moment-stat-item.liked {
            background: rgba(239, 68, 68, 0.7);
          }

          .moment-stat-icon {
            width: 12px;
            height: 12px;
          }

          /* Empty state */
          .moments-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            text-align: center;
            padding: 20px;
          }

          .empty-icon {
            width: 64px;
            height: 64px;
            color: rgba(255, 255, 255, 0.3);
            margin-bottom: 16px;
          }

          .empty-title {
            font-size: 18px;
            font-weight: 600;
            color: white;
            margin: 0 0 8px 0;
          }

          .empty-description {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
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
            z-index: 1000;
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

          /* Dialog styles */
          .create-moment-dialog {
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 400px;
            width: 90%;
          }

          .create-dialog-content {
            padding: 24px;
          }

          .create-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .create-dialog-title {
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin: 0;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .close-icon {
            width: 20px;
            height: 20px;
            color: white;
          }

          .media-preview {
            width: 100%;
            aspect-ratio: 1;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 20px;
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
            width: 48px;
            height: 48px;
            margin: 0 auto 12px;
          }

          .placeholder-text {
            font-size: 14px;
            margin: 0;
          }

          .caption-section {
            margin-bottom: 20px;
          }

          .caption-input {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            resize: none;
          }

          .caption-counter {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            text-align: right;
            margin-top: 8px;
          }

          .create-actions {
            display: flex;
            gap: 12px;
          }

          .select-media-btn,
          .submit-btn {
            flex: 1;
          }

          .hidden-file-input {
            display: none;
          }

          /* Detail dialog */
          .moment-detail-dialog {
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 500px;
            width: 95%;
          }

          .moment-detail-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
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
            gap: 16px;
          }

          .detail-user {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .detail-user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            overflow: hidden;
          }

          .detail-user-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .detail-user-avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-weight: 600;
          }

          .detail-user-details {
            flex: 1;
          }

          .detail-user-name {
            font-size: 16px;
            font-weight: 600;
            color: white;
            margin: 0;
          }

          .detail-time {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            margin: 4px 0 0 0;
          }

          .detail-caption {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;
            margin: 0;
          }

          .detail-actions {
            display: flex;
            gap: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
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
            border-radius: 8px;
            transition: background 0.2s ease;
          }

          .detail-action-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .action-icon {
            width: 20px;
            height: 20px;
          }

          .action-icon.liked {
            color: #ff6b6b;
          }
        `}</style>
      </div>
    </SignalRProvider>
  );
}