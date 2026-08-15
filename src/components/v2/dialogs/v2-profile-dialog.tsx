"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Mail,
  Camera,
  UserPlus,
  UserCheck,
  UserX,
  Loader2,
  Ban,
  Trash2,
  Tag,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/auth-slice";
import type { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser, updateCurrentUser, setAvatar } from "@/services/user";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import {
  getMyFriendships,
  acceptFriendRequest,
  rejectFriendRequest,
  revokeFriendRequest,
  blockUser,
  removeFriendship,
  changeFriendshipType,
} from "@/services/friendship";
import {
  isAccepted,
  isPending,
  getMyFriendshipType,
  FRIENDSHIP_TYPE_VALUES,
  FRIENDSHIP_TYPE_LABELS,
  type FriendshipTypeValue,
} from "@/types/friendship";
import type { FriendshipDto } from "@/types/friendship";
import { toast } from "sonner";

interface V2ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FriendView = "list" | "requests";

export function V2ProfileDialog({ open, onOpenChange }: V2ProfileDialogProps) {
  const dispatch = useAppDispatch();
  const reduxUser = useSelector((state: RootState) => state.auth.user);
  const [user, setUserState] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(reduxUser?.name || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Friends data (inlined — no nested modal)
  const [friendships, setFriendships] = useState<FriendshipDto[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [typePickerId, setTypePickerId] = useState<number | null>(null);

  const fetchFriendships = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const res = await getMyFriendships({ take: 100 });
      setFriendships(res.data);
    } catch (err) {
      console.error("Failed to load friendships:", err);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  // Load full user profile + friends when dialog opens
  useEffect(() => {
    if (open) {
      getCurrentUser()
        .then(setUserState)
        .catch((err) => console.error("Failed to load user profile:", err));
      fetchFriendships();
    } else {
      setTypePickerId(null);
    }
  }, [open, fetchFriendships]);

  const incomingRequests = friendships.filter(
    (f) => isPending(f) && f.requestedById !== reduxUser?.id,
  );
  const myRequests = friendships.filter(
    (f) => isPending(f) && f.requestedById === reduxUser?.id,
  );
  const friends = friendships.filter((f) => isAccepted(f));

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const updated = await updateCurrentUser({ name: name.trim() });
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

  // ---- Friend actions (v1 services) ----
  const handleAccept = async (f: FriendshipDto) => {
    setProcessingId(f.id);
    try {
      await acceptFriendRequest(f.id);
      await fetchFriendships();
      toast.success(`Accepted ${f.otherUserName}`);
    } catch {
      toast.error("Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (f: FriendshipDto) => {
    setProcessingId(f.id);
    try {
      await rejectFriendRequest(f.id);
      await fetchFriendships();
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (f: FriendshipDto) => {
    setProcessingId(f.id);
    try {
      await revokeFriendRequest(f.id);
      await fetchFriendships();
    } catch {
      toast.error("Failed to cancel request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeType = async (f: FriendshipDto, type: FriendshipTypeValue) => {
    setProcessingId(f.id);
    try {
      await changeFriendshipType(f.id, type);
      await fetchFriendships();
      setTypePickerId(null);
      toast.success("Friend type updated");
    } catch {
      toast.error("Failed to change friend type");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlock = async (f: FriendshipDto) => {
    if (!window.confirm(`Block ${f.otherUserName}?`)) return;
    setProcessingId(f.id);
    try {
      await blockUser(f.id);
      await fetchFriendships();
      toast.success(`Blocked ${f.otherUserName}`);
    } catch {
      toast.error("Failed to block user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteFriend = async (f: FriendshipDto) => {
    if (!window.confirm(`Remove ${f.otherUserName} from friends?`)) return;
    setProcessingId(f.id);
    try {
      await removeFriendship(f.id);
      await fetchFriendships();
      toast.success(`Removed ${f.otherUserName}`);
    } catch {
      toast.error("Failed to delete friend");
    } finally {
      setProcessingId(null);
    }
  };

  const initials = user?.name?.charAt(0) || "?";

  const renderFriendAvatar = (f: FriendshipDto) => (
    <div className="pf-row-avatar">
      {f.otherUserImage?.thumbUrl ? (
        <img
          src={f.otherUserImage.thumbUrl}
          alt={f.otherUserName}
          className="pf-row-avatar-img"
        />
      ) : (
        <span className="pf-row-avatar-initial">
          {f.otherUserName?.charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog" showCloseButton={false}>
        <div className="dialog-content">
          {/* Profile header */}
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

          {/* Friends — inline sections, no nested modal */}
          <div className="pf-section">
            <p className="pf-section-label">
              Friends
              <span className="pf-section-count">{friends.length}</span>
            </p>

            {loadingFriends ? (
              <div className="pf-loading">
                <Loader2 className="pf-loading-icon" />
              </div>
            ) : (
              <div className="pf-list">
                {friends.length === 0 && (
                  <p className="pf-empty">No friends yet</p>
                )}
                {friends.map((f) => {
                  const currentType = getMyFriendshipType(f, reduxUser?.id);
                  const typePickerOpen = typePickerId === f.id;
                  return (
                    <div key={f.id} className="pf-row">
                      {renderFriendAvatar(f)}
                      <div className="pf-row-info">
                        <span className="pf-row-name">{f.otherUserName}</span>
                        <span className="pf-row-sub">
                          {FRIENDSHIP_TYPE_LABELS[currentType]}
                        </span>
                      </div>
                      <div className="pf-row-actions">
                        <button
                          onClick={() => setTypePickerId(typePickerOpen ? null : f.id)}
                          className="pf-btn pf-btn-type"
                          aria-label="Change friend type"
                        >
                          <Tag className="pf-btn-icon" />
                        </button>
                        <button
                          onClick={() => handleBlock(f)}
                          disabled={processingId === f.id}
                          className="pf-btn pf-btn-block"
                          aria-label="Block"
                        >
                          <Ban className="pf-btn-icon" />
                        </button>
                        <button
                          onClick={() => handleDeleteFriend(f)}
                          disabled={processingId === f.id}
                          className="pf-btn pf-btn-delete"
                          aria-label="Delete friend"
                        >
                          <Trash2 className="pf-btn-icon" />
                        </button>
                      </div>

                      {typePickerOpen && (
                        <div className="pf-type-picker">
                          {(
                            Object.entries(FRIENDSHIP_TYPE_VALUES) as [
                              string,
                              FriendshipTypeValue,
                            ][]
                          ).map(([, value]) => (
                            <button
                              key={value}
                              onClick={() => handleChangeType(f, value)}
                              disabled={processingId === f.id}
                              className={`pf-type-option ${
                                value === currentType ? "active" : ""
                              }`}
                            >
                              {FRIENDSHIP_TYPE_LABELS[value]}
                              {value === currentType && (
                                <UserCheck className="pf-type-check" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Received requests */}
          {incomingRequests.length > 0 && (
            <div className="pf-section">
              <p className="pf-section-label">
                Received requests
                <span className="pf-section-count pf-section-count-alert">
                  {incomingRequests.length}
                </span>
              </p>
              <div className="pf-list">
                {incomingRequests.map((f) => (
                  <div key={f.id} className="pf-row">
                    {renderFriendAvatar(f)}
                    <div className="pf-row-info">
                      <span className="pf-row-name">{f.otherUserName}</span>
                      <span className="pf-row-sub">wants to be your friend</span>
                    </div>
                    <div className="pf-row-actions">
                      <button
                        onClick={() => handleAccept(f)}
                        disabled={processingId === f.id}
                        className="pf-btn pf-btn-accept"
                        aria-label="Accept"
                      >
                        <UserCheck className="pf-btn-icon" />
                      </button>
                      <button
                        onClick={() => handleReject(f)}
                        disabled={processingId === f.id}
                        className="pf-btn pf-btn-delete"
                        aria-label="Reject"
                      >
                        <UserX className="pf-btn-icon" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent requests */}
          {myRequests.length > 0 && (
            <div className="pf-section">
              <p className="pf-section-label">
                Sent requests
                <span className="pf-section-count">{myRequests.length}</span>
              </p>
              <div className="pf-list">
                {myRequests.map((f) => (
                  <div key={f.id} className="pf-row">
                    {renderFriendAvatar(f)}
                    <div className="pf-row-info">
                      <span className="pf-row-name">{f.otherUserName}</span>
                      <span className="pf-row-sub">waiting for response</span>
                    </div>
                    <div className="pf-row-actions">
                      <button
                        onClick={() => handleRevoke(f)}
                        disabled={processingId === f.id}
                        className="pf-btn pf-btn-delete"
                        aria-label="Cancel request"
                      >
                        <UserX className="pf-btn-icon" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <style jsx global>{`
          /* ---- Friends inline sections ---- */
          .pf-section {
            margin-top: 16px;
          }

          .pf-section-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: rgba(255, 255, 255, 0.45);
            margin: 0 4px 8px;
          }

          .pf-section-count {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.7);
            font-size: 10px;
            font-weight: 700;
            min-width: 16px;
            height: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            padding: 0 4px;
          }

          .pf-section-count-alert {
            background: rgba(239, 68, 68, 0.25);
            color: #f87171;
          }

          .pf-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 0;
          }

          .pf-loading-icon {
            width: 22px;
            height: 22px;
            color: white;
            animation: pf-spin 1s linear infinite;
          }

          @keyframes pf-spin {
            to { transform: rotate(360deg); }
          }

          .pf-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .pf-empty {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.45);
            text-align: center;
            margin: 8px 0;
          }

          .pf-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            flex-wrap: wrap;
          }

          .pf-row-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .pf-row-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .pf-row-avatar-initial {
            color: white;
            font-weight: 700;
            font-size: 14px;
          }

          .pf-row-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 1px;
          }

          .pf-row-name {
            font-size: 13px;
            font-weight: 600;
            color: white;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .pf-row-sub {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .pf-row-actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
          }

          .pf-btn {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
          }

          .pf-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .pf-btn-icon {
            width: 14px;
            height: 14px;
          }

          .pf-btn-accept {
            background: #22c55e;
            color: white;
          }

          .pf-btn-type {
            background: rgba(43, 176, 175, 0.15);
            border: 1px solid rgba(43, 176, 175, 0.4);
            color: #2BB0AF;
          }

          .pf-btn-block {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.4);
            color: #f59e0b;
          }

          .pf-btn-delete {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #ef4444;
          }

          .pf-type-picker {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-top: 8px;
            margin-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .pf-type-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 8px 10px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.85);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .pf-type-option:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
          }

          .pf-type-option.active {
            background: rgba(43, 176, 175, 0.15);
            border-color: rgba(43, 176, 175, 0.5);
            color: #2BB0AF;
          }

          .pf-type-option:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .pf-type-check {
            width: 13px;
            height: 13px;
          }

          /* ---- Profile header ---- */
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
            background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
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

          .loading-spinner {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: pf-spin 1s linear infinite;
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

          .profile-header {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .profile-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .profile-name {
            font-size: 18px;
            font-weight: 700;
            color: white;
            margin: 0;
          }

          .profile-email {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            margin: 0;
          }

          .profile-email-icon {
            width: 14px;
            height: 14px;
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
            margin-top: 0;
            padding: 2px 8px;
            height: 26px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
