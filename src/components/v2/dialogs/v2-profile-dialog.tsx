"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Mail, Camera } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/auth-slice";
import type { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser, updateCurrentUser, setAvatar } from "@/services/user";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import { toast } from "sonner";

interface V2ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2ProfileDialog({ open, onOpenChange }: V2ProfileDialogProps) {
  const dispatch = useAppDispatch();
  const reduxUser = useSelector((state: RootState) => state.auth.user);
  const [user, setUserState] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(reduxUser?.name || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load full user profile when dialog opens
  useEffect(() => {
    if (open) {
      getCurrentUser()
        .then(setUserState)
        .catch((err) => console.error("Failed to load user profile:", err));
    }
  }, [open]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const updated = await updateCurrentUser({ name: name.trim() });
      // Update Redux with basic fields
      dispatch(setCredentials({ 
        user: { id: updated.id, name: updated.name, email: updated.email } 
      }));
      setUserState(updated);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      setUploadingAvatar(true);
      const presigned = await getPresignedUploadUrls({
        bucket: "Profile",
        contentTypes: [file.type],
      });
      await uploadToPresignedUrl(presigned[0].uploadUrl, file, file.type);
      const updated = await setAvatar(presigned[0].fileId);
      // Update Redux with basic fields
      dispatch(setCredentials({ 
        user: { id: updated.id, name: updated.name, email: updated.email } 
      }));
      setUserState(updated);
      toast.success("Avatar updated successfully");
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast.error("Failed to update avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = user?.name?.charAt(0) || "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog" showCloseButton={false}>
        <div className="dialog-content">
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {user?.images && user.images[0] ? (
                  <img 
                    src={user.images[0].thumbUrl || user.images[0].originalUrl}
                    alt="Profile" 
                    className="profile-avatar-image"
                  />
                ) : (
                  <span className="profile-avatar-initial">{initials}</span>
                )}
                {uploadingAvatar && (
                  <div className="profile-avatar-loading">
                    <div className="loading-spinner" />
                  </div>
                )}
              </div>
              <label className="profile-avatar-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                  }}
                  className="hidden"
                />
                <Camera className="profile-avatar-icon" />
              </label>
            </div>
            <div className="profile-info">
              {isEditing ? (
                <div className="profile-edit-section">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="profile-name-input"
                    placeholder="Your name"
                    maxLength={50}
                  />
                  <div className="profile-edit-actions">
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setName(user?.name || "");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isLoading || !name.trim()}
                      size="sm"
                    >
                      {isLoading ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="profile-name">{user?.name || "User"}</h3>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="ghost"
                    size="sm"
                    className="profile-edit-btn"
                  >
                    Edit Profile
                  </Button>
                </>
              )}
              <p className="profile-email">
                <Mail className="profile-email-icon" />
                {user?.email || ""}
              </p>
            </div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="stat-value">142</span>
              <span className="stat-label">Friends</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">89</span>
              <span className="stat-label">Moments</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">23</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .profile-avatar-section {
            position: relative;
            display: inline-block;
          }

          .profile-avatar {
            position: relative;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 3px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
          }

          .profile-avatar-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .profile-avatar-initial {
            font-size: 32px;
            font-weight: 700;
            color: white;
          }

          .profile-avatar-loading {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }

          .profile-avatar-upload {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 28px;
            height: 28px;
            background: #2BB0AF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid white;
          }

          .profile-avatar-upload:hover {
            transform: scale(1.1);
          }

          .profile-avatar-icon {
            width: 14px;
            height: 14px;
            color: white;
          }

          .profile-edit-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .profile-name-input {
            width: 100%;
          }

          .profile-edit-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }

          .profile-edit-btn {
            margin-top: 4px;
            padding: 4px 8px;
            height: 28px;
          }

          .profile-email {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            margin-top: 4px;
          }

          .profile-email-icon {
            width: 14px;
            height: 14px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
