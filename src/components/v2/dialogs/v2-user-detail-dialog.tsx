"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { LoadingVideo } from "@/components/common/loading-video";
import {
  Mail,
  Camera,
  UserPlus,
  UserCheck,
  UserX,
  Ban,
  Trash2,
  Tag,
  MessageCircle,
  Pencil,
  ChevronLeft,
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/auth-slice";
import type { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUserById, getCurrentUser, updateCurrentUser, setAvatar } from "@/services/user";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import { getOpponentConversation } from "@/services/chat";
import { appHub } from "@/lib/signalr/app-hub";
import {
  getMyFriendships,
  getFriendshipById,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  revokeFriendRequest,
  blockUser,
  unblockUser,
  removeFriendship,
  changeFriendshipType,
} from "@/services/friendship";
import {
  isAccepted,
  isPending,
  isPendingStatus,
  isAcceptedStatus,
  isBlockedStatus,
  getMyFriendshipType,
  FRIENDSHIP_TYPE_VALUES,
  FRIENDSHIP_TYPE_LABELS,
  type FriendshipTypeValue,
} from "@/types/friendship";
import type { FriendshipDto } from "@/types/friendship";
import { toast } from "sonner";

/** Same mapping as v1's settings edit dialog */
const GENDER_LABELS: Record<number, string> = {
  1: "Nam",
  2: "Nữ",
  3: "Gay",
  4: "Les",
};

interface V2UserDetailDialogProps {
  /** null = closed; "me" = my profile; number = other user id */
  userId: "me" | number | null;
  onClose: () => void;
  /** Extra context from the map (other users only) */
  battery?: number | null;
  status?: string | null;
  distance?: number | null;
}

export function V2UserDetailDialog({
  userId,
  onClose,
  battery,
  status,
  distance,
}: V2UserDetailDialogProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const reduxUser = useSelector((state: RootState) => state.auth.user);

  // Internal navigation: when viewing another user from inside my profile
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  // Reset internal navigation whenever the dialog closes or the target changes
  useEffect(() => {
    if (userId === null) setViewingUserId(null);
  }, [userId]);

  // The user this dialog currently shows
  const effectiveUserId: "me" | number | null =
    viewingUserId !== null ? viewingUserId : userId;

  const isMe = effectiveUserId === "me";
  const otherId = typeof effectiveUserId === "number" ? effectiveUserId : null;

  // ---- User detail (v1 useUser pattern, inline) ----
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const fetchUserDetail = useCallback(async () => {
    if (effectiveUserId === null) return;
    setLoadingUser(true);
    try {
      const u = isMe ? await getCurrentUser() : await getUserById(otherId!);
      setUserDetail(u);
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setLoadingUser(false);
    }
  }, [effectiveUserId, isMe, otherId]);

  useEffect(() => {
    setUserDetail(null);
    if (effectiveUserId !== null) fetchUserDetail();
  }, [effectiveUserId, fetchUserDetail]);

  // v1 parity: refetch the open user's detail when their friendship changes
  // in real time (other user accepts/blocks/etc. while we're viewing them)
  useEffect(() => {
    if (effectiveUserId === null || isMe) return;

    const getOpponentId = (dto: { user1Id: number; user2Id: number }) =>
      dto.user1Id === reduxUser?.id ? dto.user2Id : dto.user1Id;

    const refetchIfRelevant = (dto: { user1Id: number; user2Id: number }) => {
      if (getOpponentId(dto) === otherId) fetchUserDetail();
    };

    const unsubCreated = appHub.onReceiveFriendshipCreated(refetchIfRelevant);
    const unsubAccepted = appHub.onReceiveFriendshipAccepted(refetchIfRelevant);
    const unsubBlocked = appHub.onReceiveFriendshipBlocked(refetchIfRelevant);
    const unsubUnblocked = appHub.onReceiveFriendshipUnblocked(refetchIfRelevant);
    return () => {
      unsubCreated();
      unsubAccepted();
      unsubBlocked();
      unsubUnblocked();
    };
  }, [effectiveUserId, isMe, otherId, reduxUser?.id, fetchUserDetail]);

  // ---- My profile editing ----
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [genderId, setGenderId] = useState("1");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (isMe && userDetail) {
      setName(userDetail.name);
      setAge(userDetail.age != null ? String(userDetail.age) : "");
      setGenderId(userDetail.genderId != null ? String(userDetail.genderId) : "1");
    }
  }, [isMe, userDetail]);

  const handleSaveProfile = async () => {
    if (!userDetail) return;
    try {
      setSavingProfile(true);
      const updated = await updateCurrentUser({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        genderId: Number(genderId),
      });
      dispatch(
        setCredentials({ user: { id: updated.id, name: updated.name, email: updated.email } }),
      );
      setUserDetail(updated);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!userDetail) return;
    try {
      setUploadingAvatar(true);
      const presigned = await getPresignedUploadUrls({
        bucket: "Profile",
        contentTypes: [file.type],
      });
      await uploadToPresignedUrl(presigned[0].uploadUrl, file, file.type);
      const updated = await setAvatar(presigned[0].fileId);
      dispatch(
        setCredentials({ user: { id: updated.id, name: updated.name, email: updated.email } }),
      );
      setUserDetail(updated);
      toast.success("Avatar updated successfully");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---- Other user: friendship state (v1 MarkerDetail logic) ----
  const friendship = userDetail?.friendship ?? null;
  const [friendshipDetail, setFriendshipDetail] = useState<FriendshipDto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isMe || !friendship || !isAcceptedStatus(friendship)) {
      setFriendshipDetail(null);
      return;
    }
    getFriendshipByIdSafe(friendship.friendshipId).then((dto) => {
      if (!cancelled) setFriendshipDetail(dto);
    });
    return () => {
      cancelled = true;
    };
  }, [friendship, isMe]);

  const runFriendshipAction = async (action: () => Promise<unknown>) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await action();
      await fetchUserDetail();
    } catch (err) {
      console.error("Friendship action failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChat = useCallback(async () => {
    if (isMe || !userDetail) return;
    try {
      const res = await getOpponentConversation(userDetail.id);
      if (res.data) {
        router.push(`/chat/${res.data}`);
      } else {
        router.push(`/chat/new?receiverId=${userDetail.id}&name=${encodeURIComponent(userDetail.name)}`);
      }
    } catch {
      router.push(`/chat/new?receiverId=${userDetail.id}&name=${encodeURIComponent(userDetail.name)}`);
    }
  }, [isMe, userDetail, router]);

  const handleViewProfile = useCallback(() => {
    if (isMe || !userDetail) return;
    router.push(`/user/${userDetail.id}`);
  }, [isMe, userDetail, router]);

  // ---- My friends list (inline, only for me) ----
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

  useEffect(() => {
    if (effectiveUserId === "me") fetchFriendships();
    else setTypePickerId(null);
  }, [effectiveUserId, fetchFriendships]);

  const incomingRequests = friendships.filter(
    (f) => isPending(f) && f.requestedById !== reduxUser?.id,
  );
  const myRequests = friendships.filter(
    (f) => isPending(f) && f.requestedById === reduxUser?.id,
  );
  const friends = friendships.filter((f) => isAccepted(f));

  const handleFriendAction = async (f: FriendshipDto, action: () => Promise<unknown>) => {
    setProcessingId(f.id);
    try {
      await action();
      await fetchFriendships();
    } catch {
      toast.error("Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleFriendTypeChange = async (f: FriendshipDto, type: FriendshipTypeValue) => {
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

  // v1 pattern: opponent id from a friendship record
  const getOpponentId = (f: FriendshipDto): number =>
    f.user1Id === reduxUser?.id ? f.user2Id : f.user1Id;

  // Navigate inside this dialog to a friend's info
  const handleViewFriend = (f: FriendshipDto) => {
    setTypePickerId(null);
    setViewingUserId(getOpponentId(f));
  };

  const name_display = userDetail?.name ?? (isMe ? reduxUser?.name : null) ?? "Unknown";
  const avatarUrl =
    userDetail?.images?.[0]?.thumbUrl || userDetail?.images?.[0]?.originalUrl || undefined;
  const email = userDetail?.email ?? (isMe ? reduxUser?.email : null);
  const initials = name_display?.charAt(0).toUpperCase() || "?";

  const renderFriendshipButton = () => {
    if (isMe) return null;

    if (friendship && isBlockedStatus(friendship)) {
      const isBlocker = friendship.blockedById === reduxUser?.id;
      if (isBlocker) {
        return (
          <button
            onClick={() => runFriendshipAction(() => unblockUser(friendship.friendshipId))}
            disabled={actionLoading}
            className="vud-action-btn vud-action-secondary"
          >
            {actionLoading ? "..." : "Bỏ chặn"}
          </button>
        );
      }
      return (
        <button disabled className="vud-action-btn vud-action-disabled">
          Đã chặn
        </button>
      );
    }

    if (!friendship) {
      return (
        <button
          onClick={() => runFriendshipAction(() => sendFriendRequest(userDetail!.id))}
          disabled={actionLoading}
          className="vud-action-btn vud-action-success"
        >
          <UserPlus className="vud-action-icon" />
          {actionLoading ? "..." : "Kết bạn"}
        </button>
      );
    }

    if (isPendingStatus(friendship)) {
      const isReceived = friendship.requestedById === userDetail?.id;
      if (isReceived) {
        return (
          <div className="vud-action-row">
            <button
              onClick={() => runFriendshipAction(() => acceptFriendRequest(friendship.friendshipId))}
              disabled={actionLoading}
              className="vud-action-btn vud-action-success"
            >
              <UserCheck className="vud-action-icon" />
              Chấp nhận
            </button>
            <button
              onClick={() => runFriendshipAction(() => rejectFriendRequest(friendship.friendshipId))}
              disabled={actionLoading}
              className="vud-action-btn vud-action-secondary"
            >
              <UserX className="vud-action-icon" />
              Từ chối
            </button>
          </div>
        );
      }
      return (
        <button
          onClick={() => runFriendshipAction(() => revokeFriendRequest(friendship.friendshipId))}
          disabled={actionLoading}
          className="vud-action-btn vud-action-secondary"
        >
          {actionLoading ? "..." : "Đã gửi lời mời · Hủy"}
        </button>
      );
    }

    if (isAcceptedStatus(friendship)) {
      const myType = friendshipDetail
        ? getMyFriendshipType(friendshipDetail, reduxUser?.id)
        : FRIENDSHIP_TYPE_VALUES.Friend;
      // Accepted friend: info only — message button is rendered alongside
      return (
        <div className="vud-friend-badge">
          <UserCheck className="vud-friend-badge-icon" />
          Bạn bè · {FRIENDSHIP_TYPE_LABELS[myType]}
        </div>
      );
    }

    return null;
  };

  const renderFriendRow = (f: FriendshipDto) => (
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
    <Dialog open={userId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="v2-dialog" showCloseButton={false}>
        <div className="dialog-content">
          {loadingUser ? (
            <div className="vud-loading">
              <LoadingVideo size="sm" />
            </div>
          ) : (
            <>
              {/* Back to my profile (when viewing another user from inside it) */}
              {viewingUserId !== null && (
                <button
                  onClick={() => setViewingUserId(null)}
                  className="vud-back-btn"
                  aria-label="Back to my profile"
                >
                  <ChevronLeft className="vud-back-icon" />
                  My Profile
                </button>
              )}

              {/* Profile header */}
              <div className="profile-header">
                <div className="profile-avatar-section">
                  <div className="profile-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name_display} className="profile-avatar-image" />
                    ) : (
                      <span className="profile-avatar-initial">{initials}</span>
                    )}
                    {uploadingAvatar && (
                      <div className="profile-avatar-loading">
                        <div className="loading-spinner" />
                      </div>
                    )}
                  </div>
                  {isMe && (
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
                  )}
                </div>
                <div className="profile-info">
                  {isMe && isEditing ? (
                    <div className="profile-edit-section">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="profile-name-input"
                        placeholder="Your name"
                        maxLength={50}
                      />
                      <div className="profile-edit-row">
                        <Input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="profile-name-input"
                          placeholder="Age"
                          min={1}
                          max={150}
                        />
                        <select
                          value={genderId}
                          onChange={(e) => setGenderId(e.target.value)}
                          className="profile-gender-select"
                          aria-label="Gender"
                        >
                          <option value="1">Nam</option>
                          <option value="2">Nữ</option>
                          <option value="3">Gay</option>
                          <option value="4">Les</option>
                        </select>
                      </div>
                      <div className="profile-edit-actions">
                        <Button
                          onClick={() => {
                            setIsEditing(false);
                            setName(userDetail?.name || "");
                            setAge(userDetail?.age != null ? String(userDetail.age) : "");
                            setGenderId(
                              userDetail?.genderId != null ? String(userDetail.genderId) : "1",
                            );
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile || !name.trim()}
                          size="sm"
                        >
                          {savingProfile ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h3
                      className={`profile-name ${!isMe ? "profile-name-link" : ""}`}
                      onClick={isMe ? undefined : handleViewProfile}
                    >
                      {name_display}
                      {isMe && <span className="profile-name-tag">(You)</span>}
                    </h3>
                  )}
                  {email && (
                    <p className="profile-email">
                      <Mail className="profile-email-icon" />
                      {email}
                    </p>
                  )}
                  {/* Edit button below the email (my profile only) */}
                  {isMe && !isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="profile-edit-btn"
                    >
                      <Pencil className="profile-edit-btn-icon" />
                      Edit Profile
                    </Button>
                  )}
                  {/* Age + gender (my profile and others) */}
                  {(userDetail?.age != null || userDetail?.genderId != null) && (
                    <p className="profile-meta">
                      {userDetail?.age != null && <span>{userDetail.age} years old</span>}
                      {userDetail?.age != null && userDetail?.genderId != null && (
                        <span className="profile-meta-dot"> · </span>
                      )}
                      {userDetail?.genderId != null && (
                        <span>{GENDER_LABELS[userDetail.genderId] ?? "Other"}</span>
                      )}
                    </p>
                  )}
                  {status && (
                    <p className="profile-meta profile-meta-status">{status}</p>
                  )}
                  {!isMe && (
                    <p className="profile-meta">
                      <span className="profile-meta-online">Online</span>
                      {distance != null && (
                        <span>
                          {" "}
                          ·{" "}
                          {distance < 1000
                            ? `${Math.round(distance)}m`
                            : `${(distance / 1000).toFixed(1)}km`}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Other user: v1 action buttons */}
              {!isMe && (
                <div className="vud-actions">
                  <div className="vud-action-row">
                    {renderFriendshipButton()}
                    <button onClick={handleChat} className="vud-action-btn vud-action-primary">
                      <MessageCircle className="vud-action-icon" fill="currentColor" />
                      Nhắn tin
                    </button>
                  </div>
                </div>
              )}

              {/* My profile: inline friends sections */}
              {isMe && (
                <>
                  <div className="pf-section">
                    <p className="pf-section-label">
                      Friends
                      <span className="pf-section-count">{friends.length}</span>
                    </p>
                    {loadingFriends ? (
                      <div className="pf-loading">
                        <LoadingVideo size="sm" />
                      </div>
                    ) : (
                      <div className="pf-list">
                        {friends.length === 0 && <p className="pf-empty">No friends yet</p>}
                        {friends.map((f) => {
                          const currentType = getMyFriendshipType(f, reduxUser?.id);
                          const typePickerOpen = typePickerId === f.id;
                          return (
                            <div key={f.id} className="pf-row">
                              <button
                                className="pf-row-tap"
                                onClick={() => handleViewFriend(f)}
                                aria-label={`View ${f.otherUserName}`}
                              >
                                {renderFriendRow(f)}
                                <div className="pf-row-info">
                                  <span className="pf-row-name">{f.otherUserName}</span>
                                  <span className="pf-row-sub">
                                    {FRIENDSHIP_TYPE_LABELS[currentType]}
                                  </span>
                                </div>
                              </button>
                              <div className="pf-row-actions">
                                <button
                                  onClick={() => setTypePickerId(typePickerOpen ? null : f.id)}
                                  className="pf-btn pf-btn-type"
                                  aria-label="Change friend type"
                                >
                                  <Tag className="pf-btn-icon" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleFriendAction(f, () => blockUser(f.id))
                                  }
                                  disabled={processingId === f.id}
                                  className="pf-btn pf-btn-block"
                                  aria-label="Block"
                                >
                                  <Ban className="pf-btn-icon" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleFriendAction(f, () => removeFriendship(f.id))
                                  }
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
                                      onClick={() => handleFriendTypeChange(f, value)}
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
                            <button
                              className="pf-row-tap"
                              onClick={() => handleViewFriend(f)}
                              aria-label={`View ${f.otherUserName}`}
                            >
                              {renderFriendRow(f)}
                              <div className="pf-row-info">
                                <span className="pf-row-name">{f.otherUserName}</span>
                                <span className="pf-row-sub">wants to be your friend</span>
                              </div>
                            </button>
                            <div className="pf-row-actions">
                              <button
                                onClick={() =>
                                  handleFriendAction(f, () => acceptFriendRequest(f.id))
                                }
                                disabled={processingId === f.id}
                                className="pf-btn pf-btn-accept"
                                aria-label="Accept"
                              >
                                <UserCheck className="pf-btn-icon" />
                              </button>
                              <button
                                onClick={() =>
                                  handleFriendAction(f, () => rejectFriendRequest(f.id))
                                }
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

                  {myRequests.length > 0 && (
                    <div className="pf-section">
                      <p className="pf-section-label">
                        Sent requests
                        <span className="pf-section-count">{myRequests.length}</span>
                      </p>
                       <div className="pf-list">
                        {myRequests.map((f) => (
                          <div key={f.id} className="pf-row">
                            <button
                              className="pf-row-tap"
                              onClick={() => handleViewFriend(f)}
                              aria-label={`View ${f.otherUserName}`}
                            >
                              {renderFriendRow(f)}
                              <div className="pf-row-info">
                                <span className="pf-row-name">{f.otherUserName}</span>
                                <span className="pf-row-sub">waiting for response</span>
                              </div>
                            </button>
                            <div className="pf-row-actions">
                              <button
                                onClick={() =>
                                  handleFriendAction(f, () => revokeFriendRequest(f.id))
                                }
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
                </>
              )}
            </>
          )}
        </div>

        <style jsx global>{`
          .vud-back-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            background: none;
            border: none;
            color: #2BB0AF;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            padding: 0 0 12px;
            margin: 0;
            align-self: flex-start;
          }

          .vud-back-btn:active {
            opacity: 0.7;
          }

          .vud-back-icon {
            width: 16px;
            height: 16px;
          }

          .vud-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 0;
          }

          @keyframes vud-spin {
            to { transform: rotate(360deg); }
          }

          /* ---- Actions (other user, v1 logic) ---- */
          .vud-actions {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .vud-action-row {
            display: flex;
            gap: 8px;
            flex: 1;
          }

          .vud-action-col {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
          }

          .vud-action-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 12px;
            border-radius: 12px;
            border: none;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .vud-action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .vud-action-icon {
            width: 15px;
            height: 15px;
          }

          .vud-action-primary {
            background: #2BB0AF;
            color: white;
          }

          .vud-action-primary:hover:not(:disabled) {
            background: #1a8a89;
          }

          .vud-action-success {
            background: #22c55e;
            color: white;
          }

          .vud-action-success:hover:not(:disabled) {
            background: #16a34a;
          }

          .vud-action-secondary {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: rgba(255, 255, 255, 0.9);
          }

          .vud-action-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.16);
          }

          .vud-action-disabled {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.4);
            cursor: not-allowed;
          }

          .vud-friend-badge {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(34, 197, 94, 0.12);
            border: 1px solid rgba(34, 197, 94, 0.35);
            color: #4ade80;
            font-size: 13px;
            font-weight: 600;
          }

          .vud-friend-badge-icon {
            width: 15px;
            height: 15px;
          }

          /* ---- Profile header ---- */
          .profile-header {
            display: flex;
            align-items: center;
            gap: 16px;
          }

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
            animation: vud-spin 1s linear infinite;
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

          .profile-name-tag {
            font-size: 12px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.5);
            margin-left: 6px;
          }

          .profile-name-link {
            cursor: pointer;
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

          .profile-edit-btn {
            margin-top: 4px;
            height: 30px;
            padding: 0 12px;
            gap: 6px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
          }

          .profile-edit-btn-icon {
            width: 12px;
            height: 12px;
          }

          .profile-edit-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .profile-edit-row {
            display: flex;
            gap: 8px;
            width: 100%;
          }

          .profile-edit-row input {
            flex: 1;
            min-width: 0;
          }

          .profile-gender-select {
            width: 110px;
            flex-shrink: 0;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 8px;
            padding: 8px 10px;
            color: white;
            font-size: 13px;
            outline: none;
          }

          .profile-meta-dot {
            color: rgba(255, 255, 255, 0.3);
          }

          .profile-name-input {
            width: 100%;
          }

          .profile-edit-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }

          .profile-meta {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.55);
            margin: 0;
          }

          .profile-meta-status {
            font-style: italic;
            color: rgba(43, 176, 175, 0.95);
          }

          .profile-meta-online {
            color: #22c55e;
          }

          /* ---- My friends inline sections ---- */
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

          .pf-row-tap {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            text-align: left;
          }

          .pf-row-tap:active {
            opacity: 0.7;
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
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

const getFriendshipByIdSafe = async (id: number): Promise<FriendshipDto | null> => {
  try {
    return await getFriendshipById(id);
  } catch {
    return null;
  }
};
