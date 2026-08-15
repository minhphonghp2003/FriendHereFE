"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserPlus, UserCheck, UserX, Users, Loader2, Ban, Trash2, Tag } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  getMyFriendships,
  acceptFriendRequest,
  rejectFriendRequest,
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

interface V2FriendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogView = "requests" | "friends";

export function V2FriendsDialog({ open, onOpenChange }: V2FriendsDialogProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [view, setView] = useState<DialogView>("requests");
  const [friendships, setFriendships] = useState<FriendshipDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [typePickerId, setTypePickerId] = useState<number | null>(null);

  const fetchFriendships = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getMyFriendships({ take: 50 });
      setFriendships(res.data);
    } catch (err) {
      console.error("Failed to fetch friendships:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchFriendships();
  }, [open, fetchFriendships]);

  // Incoming requests: pending + requested by the other user
  const requests = friendships.filter(
    (f) => isPending(f) && f.requestedById !== user?.id,
  );
  // Accepted friends
  const friends = friendships.filter((f) => isAccepted(f));

  const handleAccept = async (f: FriendshipDto) => {
    setProcessingId(f.id);
    try {
      await acceptFriendRequest(f.id);
      await fetchFriendships();
      toast.success(`Accepted ${f.otherUserName}`);
    } catch (err) {
      console.error("Failed to accept request:", err);
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
      toast.success(`Rejected ${f.otherUserName}`);
    } catch (err) {
      console.error("Failed to reject request:", err);
      toast.error("Failed to reject request");
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
    } catch (err) {
      console.error("Failed to change friend type:", err);
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
    } catch (err) {
      console.error("Failed to block user:", err);
      toast.error("Failed to block user");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (f: FriendshipDto) => {
    if (!window.confirm(`Remove ${f.otherUserName} from friends?`)) return;
    setProcessingId(f.id);
    try {
      await removeFriendship(f.id);
      await fetchFriendships();
      toast.success(`Removed ${f.otherUserName}`);
    } catch (err) {
      console.error("Failed to delete friend:", err);
      toast.error("Failed to delete friend");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog" showCloseButton={false}>
        <div className="dialog-content">
          {/* Segmented tabs */}
          <div className="friends-tabs">
            <button
              onClick={() => setView("requests")}
              className={`friends-tab ${view === "requests" ? "active" : ""}`}
            >
              Requests
              {requests.length > 0 && (
                <span className="friends-tab-badge">{requests.length}</span>
              )}
            </button>
            <button
              onClick={() => setView("friends")}
              className={`friends-tab ${view === "friends" ? "active" : ""}`}
            >
              My Friends
              {friends.length > 0 && (
                <span className="friends-tab-count">{friends.length}</span>
              )}
            </button>
          </div>

          {isLoading ? (
            <div className="friends-loading">
              <Loader2 className="friends-loading-icon spinning" />
            </div>
          ) : view === "requests" ? (
            <div className="friends-list">
              {requests.length === 0 && (
                <div className="friends-empty">
                  <UserPlus className="friends-empty-icon" />
                  <p className="friends-empty-text">No pending requests</p>
                </div>
              )}
              {requests.map((f) => (
                <div key={f.id} className="friend-row">
                  <div className="friend-row-avatar">
                    {f.otherUserImage?.thumbUrl ? (
                      <img
                        src={f.otherUserImage.thumbUrl}
                        alt={f.otherUserName}
                        className="friend-row-avatar-img"
                      />
                    ) : (
                      <span className="friend-row-avatar-initial">
                        {f.otherUserName?.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="friend-row-info">
                    <span className="friend-row-name">{f.otherUserName}</span>
                    <span className="friend-row-sub">wants to be your friend</span>
                  </div>
                  <div className="friend-row-actions">
                    <button
                      onClick={() => handleAccept(f)}
                      disabled={processingId === f.id}
                      className="friend-row-btn accept"
                      aria-label="Accept"
                    >
                      <UserCheck className="friend-row-btn-icon" />
                    </button>
                    <button
                      onClick={() => handleReject(f)}
                      disabled={processingId === f.id}
                      className="friend-row-btn reject"
                      aria-label="Reject"
                    >
                      <UserX className="friend-row-btn-icon" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="friends-list">
              {friends.length === 0 && (
                <div className="friends-empty">
                  <Users className="friends-empty-icon" />
                  <p className="friends-empty-text">No friends yet</p>
                </div>
              )}
              {friends.map((f) => {
                const currentType = getMyFriendshipType(f, user?.id);
                const typePickerOpen = typePickerId === f.id;
                return (
                  <div key={f.id} className="friend-row friend-row-manage">
                    <div className="friend-row-avatar">
                      {f.otherUserImage?.thumbUrl ? (
                        <img
                          src={f.otherUserImage.thumbUrl}
                          alt={f.otherUserName}
                          className="friend-row-avatar-img"
                        />
                      ) : (
                        <span className="friend-row-avatar-initial">
                          {f.otherUserName?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="friend-row-info">
                      <span className="friend-row-name">{f.otherUserName}</span>
                      <span className="friend-row-sub">
                        {FRIENDSHIP_TYPE_LABELS[currentType]}
                      </span>
                    </div>
                    <div className="friend-row-actions">
                      <button
                        onClick={() => setTypePickerId(typePickerOpen ? null : f.id)}
                        className="friend-row-btn type"
                        aria-label="Change friend type"
                      >
                        <Tag className="friend-row-btn-icon" />
                      </button>
                      <button
                        onClick={() => handleBlock(f)}
                        disabled={processingId === f.id}
                        className="friend-row-btn block"
                        aria-label="Block"
                      >
                        <Ban className="friend-row-btn-icon" />
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        disabled={processingId === f.id}
                        className="friend-row-btn reject"
                        aria-label="Delete friend"
                      >
                        <Trash2 className="friend-row-btn-icon" />
                      </button>
                    </div>

                    {typePickerOpen && (
                      <div className="friend-type-picker">
                        {(
                          Object.entries(FRIENDSHIP_TYPE_VALUES) as [
                            string,
                            FriendshipTypeValue,
                          ][]
                        ).map(([label, value]) => (
                          <button
                            key={label}
                            onClick={() => handleChangeType(f, value)}
                            disabled={processingId === f.id}
                            className={`friend-type-option ${
                              value === currentType ? "active" : ""
                            }`}
                          >
                            {FRIENDSHIP_TYPE_LABELS[value]}
                            {value === currentType && <UserCheck className="friend-type-check" />}
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

        <style jsx global>{`
          .friends-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
          }

          .friends-tab {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 12px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .friends-tab.active {
            background: #2BB0AF;
            border-color: #2BB0AF;
            color: white;
          }

          .friends-tab-badge {
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: 700;
            min-width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            padding: 0 4px;
          }

          .friends-tab-count {
            font-size: 11px;
            opacity: 0.8;
          }

          .friends-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
            color: white;
          }

          .friends-loading-icon {
            width: 24px;
            height: 24px;
            animation: friends-spin 1s linear infinite;
          }

          @keyframes friends-spin {
            to { transform: rotate(360deg); }
          }

          .friends-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .friend-row {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
          }

          .friend-row-avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .friend-row-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .friend-row-avatar-initial {
            color: white;
            font-weight: 700;
            font-size: 16px;
          }

          .friend-row-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .friend-row-name {
            font-size: 14px;
            font-weight: 600;
            color: white;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .friend-row-sub {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
          }

          .friend-row-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
          }

          .friend-row-btn {
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
          }

          .friend-row-btn.accept {
            background: #22c55e;
            color: white;
          }

          .friend-row-btn.accept:hover:not(:disabled) {
            transform: scale(1.08);
          }

          .friend-row-btn.type {
            background: rgba(43, 176, 175, 0.15);
            border: 1px solid rgba(43, 176, 175, 0.4);
            color: #2BB0AF;
          }

          .friend-row-btn.type:hover:not(:disabled) {
            background: rgba(43, 176, 175, 0.3);
          }

          .friend-row-btn.block {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.4);
            color: #f59e0b;
          }

          .friend-row-btn.block:hover:not(:disabled) {
            background: rgba(245, 158, 11, 0.3);
          }

          .friend-row-manage {
            flex-wrap: wrap;
          }

          .friend-type-picker {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding-top: 8px;
            margin-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .friend-type-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 10px 12px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.85);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .friend-type-option:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
          }

          .friend-type-option.active {
            background: rgba(43, 176, 175, 0.15);
            border-color: rgba(43, 176, 175, 0.5);
            color: #2BB0AF;
          }

          .friend-type-option:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .friend-type-check {
            width: 14px;
            height: 14px;
          }

          .friend-row-btn.reject {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #ef4444;
          }

          .friend-row-btn.reject:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.3);
          }

          .friend-row-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .friend-row-btn-icon {
            width: 16px;
            height: 16px;
          }

          .friends-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 0;
            gap: 10px;
          }

          .friends-empty-icon {
            width: 36px;
            height: 36px;
            color: rgba(255, 255, 255, 0.3);
          }

          .friends-empty-text {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.5);
            margin: 0;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
