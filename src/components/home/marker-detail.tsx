"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOpponentConversation } from "@/services/chat";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriendship,
  blockUser,
  unblockUser,
  changeFriendshipType,
  getFriendshipById,
} from "@/services/friendship";
import type { User } from "@/types/user";
import type { AuthUser } from "@/types/auth";
import {
  isPendingStatus,
  isAcceptedStatus,
  isBlockedStatus,
  getMyFriendshipType,
  FRIENDSHIP_TYPE_VALUES,
  FRIENDSHIP_TYPE_LABELS,
} from "@/types/friendship";
import type { FriendshipDto, FriendshipTypeValue } from "@/types/friendship";
import { MessageSquare } from "lucide-react";

const MARKER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#e11d48",
  "#84cc16",
  "#a855f7",
];

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MARKER_COLORS[Math.abs(hash) % MARKER_COLORS.length];
};

interface MarkerDetailProps {
  isCurrentUser?: boolean;
  currentUser?: AuthUser | null;
  userDetail?: User | null;
  loading?: boolean;
  battery?: number | null;
  status?: string | null;
  distance?: number | null;
  onClose: () => void;
  onFriendshipChange?: () => void;
}

export const MarkerDetail = ({
  isCurrentUser,
  currentUser,
  userDetail,
  loading,
  battery,
  status,
  distance,
  onClose,
  onFriendshipChange,
}: MarkerDetailProps) => {
  const name = userDetail?.name ?? (isCurrentUser ? currentUser?.name : null) ?? "Unknown";
  const image =
    userDetail?.images?.[0]?.originalUrl ?? userDetail?.images?.[0]?.thumbUrl ?? undefined;
  const email = userDetail?.email ?? (isCurrentUser ? currentUser?.email : null);
  const age = userDetail?.age;

  const color = useMemo(() => stringToColor(name), [name]);
  const firstLetter = name?.charAt(0).toUpperCase() || "?";
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  const friendship = userDetail?.friendship ?? null;

  const [friendshipDetail, setFriendshipDetail] = useState<FriendshipDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (isCurrentUser || !friendship || !isAcceptedStatus(friendship)) {
      Promise.resolve(null).then((v) => {
        if (!cancelled) setFriendshipDetail(v);
      });
      return;
    }
    getFriendshipById(friendship.friendshipId)
      .then((dto) => {
        if (!cancelled) setFriendshipDetail(dto);
      })
      .catch(() => {
        if (!cancelled) setFriendshipDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [friendship, isCurrentUser]);
  const handleChat = useCallback(async () => {
    if (isCurrentUser || !userDetail) return;
    try {
      const res = await getOpponentConversation(userDetail.id);
      if (res.data) {
        router.push(`/legacy/chat/${res.data}`);
      } else {
        router.push(`/legacy/chat/new?receiverId=${userDetail.id}&name=${encodeURIComponent(name)}`);
      }
    } catch {
      router.push(`/legacy/chat/new?receiverId=${userDetail.id}&name=${encodeURIComponent(name)}`);
    }
  }, [isCurrentUser, userDetail, name, router]);

  const handleSendFriendRequest = useCallback(async () => {
    if (!userDetail || actionLoading) return;
    setActionLoading(true);
    try {
      await sendFriendRequest(userDetail.id);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to send friend request", err);
    } finally {
      setActionLoading(false);
    }
  }, [userDetail, actionLoading, onFriendshipChange]);

  const handleAccept = useCallback(async () => {
    if (!friendship || actionLoading) return;
    setActionLoading(true);
    try {
      await acceptFriendRequest(friendship.friendshipId);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to accept friend request", err);
    } finally {
      setActionLoading(false);
    }
  }, [friendship, actionLoading, onFriendshipChange]);

  const handleReject = useCallback(async () => {
    if (!friendship || actionLoading) return;
    setActionLoading(true);
    try {
      await rejectFriendRequest(friendship.friendshipId);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to reject friend request", err);
    } finally {
      setActionLoading(false);
    }
  }, [friendship, actionLoading, onFriendshipChange]);

  const handleRemove = useCallback(async () => {
    if (!friendship || actionLoading) return;
    setActionLoading(true);
    try {
      await removeFriendship(friendship.friendshipId);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to remove friendship", err);
    } finally {
      setActionLoading(false);
    }
  }, [friendship, actionLoading, onFriendshipChange]);

  const handleBlock = useCallback(async () => {
    if (!friendship || actionLoading) return;
    setActionLoading(true);
    try {
      await blockUser(friendship.friendshipId);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to block user", err);
    } finally {
      setActionLoading(false);
    }
  }, [friendship, actionLoading, onFriendshipChange]);

  const handleUnblock = useCallback(async () => {
    if (!friendship || actionLoading) return;
    setActionLoading(true);
    try {
      await unblockUser(friendship.friendshipId);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to unblock user", err);
    } finally {
      setActionLoading(false);
    }
  }, [friendship, actionLoading, onFriendshipChange]);

  const handleChangeType = useCallback(
    async (type: FriendshipTypeValue) => {
      if (!friendship || actionLoading) return;
      setActionLoading(true);
      try {
        await changeFriendshipType(friendship.friendshipId, type);
        onFriendshipChange?.();
      } catch (err) {
        console.error("Failed to change friendship type", err);
      } finally {
        setActionLoading(false);
      }
    },
    [friendship, actionLoading, onFriendshipChange],
  );

  const handleViewProfile = useCallback(() => {
    if (isCurrentUser || !userDetail) return;
    router.push(`/legacy/user/${userDetail.id}`);
  }, [isCurrentUser, userDetail, router]);

  if (loading) {
    return (
      <div className="absolute right-0 bottom-0 left-0 z-50 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        <div className="flex animate-pulse items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
      </div>
    );
  }

  const renderFriendshipButton = () => {
    if (isCurrentUser) return null;

    if (friendship && isBlockedStatus(friendship)) {
      const isBlocker =
        friendship.blockedById != null && friendship.blockedById === currentUser?.id;
      if (isBlocker) {
        return (
          <button
            onClick={handleUnblock}
            disabled={actionLoading}
            className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            {actionLoading ? "..." : "Bỏ chặn"}
          </button>
        );
      }
      return (
        <button
          disabled
          className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
        >
          Đã chặn
        </button>
      );
    }

    if (!friendship) {
      return (
        <button
          onClick={handleSendFriendRequest}
          disabled={actionLoading}
          className="bg-success text-success-foreground hover:bg-success/90 flex-1 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {actionLoading ? "..." : "Kết bạn"}
        </button>
      );
    }

    if (isPendingStatus(friendship)) {
      const isReceived = friendship.requestedById === userDetail?.id;
      if (isReceived) {
        return (
          <div className="flex flex-1 gap-2">
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="bg-success text-success-foreground hover:bg-success/90 flex-1 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            >
              Chấp nhận
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Từ chối
            </button>
          </div>
        );
      }
      return (
        <button
          disabled
          className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
        >
          Đã gửi lời mời
        </button>
      );
    }

    if (isAcceptedStatus(friendship)) {
      const myType = friendshipDetail
        ? getMyFriendshipType(friendshipDetail, currentUser?.id)
        : FRIENDSHIP_TYPE_VALUES.Friend;
      return (
        <div className="flex flex-1 flex-col gap-1.5">
          <button
            onClick={handleRemove}
            disabled={actionLoading}
            className="rounded-lg bg-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            {actionLoading ? "..." : "Bạn bè ✓"}
          </button>
          <select
            value={String(myType)}
            disabled={actionLoading || !friendshipDetail}
            onChange={(e) => handleChangeType(Number(e.target.value) as FriendshipTypeValue)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {Object.entries(FRIENDSHIP_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="absolute right-0 bottom-0 left-0 z-50 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
      <div className="flex items-start gap-3">
        <button
          onClick={handleViewProfile}
          disabled={isCurrentUser}
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow disabled:cursor-default"
          style={{ backgroundColor: isCurrentUser ? "#3b82f6" : color }}
        >
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-white">{firstLetter}</span>
          )}
        </button>
        <div
          className={`min-w-0 flex-1 ${isCurrentUser ? "" : "cursor-pointer"}`}
          onClick={isCurrentUser ? undefined : handleViewProfile}
        >
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
            {name}
            {isCurrentUser && <span className="ml-2 text-xs font-normal text-zinc-500">(You)</span>}
          </p>
          {email && <p className="mt-0.5 text-xs text-zinc-500">{email}</p>}
          {age && <p className="text-xs text-zinc-500">{age} years old</p>}
          {status && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-blue-600">
              <MessageSquare className="h-3 w-3 shrink-0" />
              <span className="truncate">{status}</span>
            </p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="text-emerald-500">Online</span>
            {battery != null && (
              <>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500">Pin {battery}%</span>
              </>
            )}
            {distance !== undefined && distance !== null && (
              <>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500">
                  {distance < 1000
                    ? `${Math.round(distance)}m`
                    : `${(distance / 1000).toFixed(1)}km`}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
        >
          ✕
        </button>
      </div>
      {!isCurrentUser && (
        <div className="mt-3">
          <div className="flex gap-2">
            {renderFriendshipButton()}
            <button
              onClick={handleChat}
              className="bg-primary hover:bg-primary/90 flex-1 rounded-lg py-2 text-sm font-medium text-white"
            >
              Nhắn tin
            </button>
          </div>
          {friendship && isAcceptedStatus(friendship) && !isBlockedStatus(friendship) && (
            <button
              onClick={handleBlock}
              disabled={actionLoading}
              className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
            >
              Chặn người dùng
            </button>
          )}
        </div>
      )}
    </div>
  );
};
