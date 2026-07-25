"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOpponentConversation } from "@/services/chat";
import { getFriendshipsByUserId, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriendship } from "@/services/friendship";
import { useAuth } from "@/providers/auth-provider";
import type { User } from "@/types/user";
import type { AuthUser } from "@/types/auth";
import type { FriendshipDto } from "@/types/friendship";

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
  onClose: () => void;
  onFriendshipChange?: () => void;
}

export const MarkerDetail = ({ isCurrentUser, currentUser, userDetail, loading, onClose, onFriendshipChange }: MarkerDetailProps) => {
  const name = userDetail?.name ?? (isCurrentUser ? currentUser?.name : null) ?? "Unknown";
  const image = userDetail?.images?.[0]?.originalUrl ?? userDetail?.images?.[0]?.thumbUrl ?? undefined;
  const email = userDetail?.email ?? (isCurrentUser ? currentUser?.email : null);
  const age = userDetail?.age;

  const color = useMemo(() => stringToColor(name), [name]);
  const firstLetter = name?.charAt(0).toUpperCase() || "?";
  const router = useRouter();
  const { user } = useAuth();
  const [friendship, setFriendship] = useState<FriendshipDto | null>(null);
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!userDetail || isCurrentUser || !user) {
      setFriendship(null);
      return;
    }
    setFriendshipLoading(true);
    getFriendshipsByUserId(user.id)
      .then((list) => {
        const found = list.find(
          (f) =>
            f.status !== "Removed" &&
            ((f.user1Id === user.id && f.user2Id === userDetail.id) ||
              (f.user1Id === userDetail.id && f.user2Id === user.id))
        );
        setFriendship(found ?? null);
      })
      .catch(() => setFriendship(null))
      .finally(() => setFriendshipLoading(false));
  }, [userDetail?.id, isCurrentUser, user?.id]);

  const handleChat = useCallback(async () => {
    if (isCurrentUser || !userDetail) return;
    try {
      const res = await getOpponentConversation(userDetail.id);
      if (res.data) {
        router.push(`/chat/${res.data}`);
      } else {
        router.push(`/chat/new?receiverId=${userDetail.id}&name=${encodeURIComponent(name)}`);
      }
    } catch {
      router.push(`/chat/new?receiverId=${userDetail.id}&name=${encodeURIComponent(name)}`);
    }
  }, [isCurrentUser, userDetail, name, router]);

  const handleSendFriendRequest = useCallback(async () => {
    if (!userDetail || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await sendFriendRequest(userDetail.id);
      setFriendship(res);
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
      const res = await acceptFriendRequest(friendship.id);
      setFriendship(res);
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
      const res = await rejectFriendRequest(friendship.id);
      setFriendship(res);
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
      await removeFriendship(friendship.id);
      setFriendship(null);
      onFriendshipChange?.();
    } catch (err) {
      console.error("Failed to remove friendship", err);
    } finally {
      setActionLoading(false);
    }
  }, [friendship, actionLoading, onFriendshipChange]);

  if (loading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
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
    if (isCurrentUser || friendshipLoading) return null;

    if (!friendship) {
      return (
        <button
          onClick={handleSendFriendRequest}
          disabled={actionLoading}
          className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {actionLoading ? "..." : "Kết bạn"}
        </button>
      );
    }

    if (friendship.status === "Pending") {
      if (friendship.requestedById === user?.id) {
        return null;
      }
      return (
        <div className="flex gap-2 w-full">
          <button
            onClick={handleAccept}
            disabled={actionLoading}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
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

    return null;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow"
          style={{ backgroundColor: isCurrentUser ? "#3b82f6" : color }}
        >
          {image ? (
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-white">{firstLetter}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
            {name}
            {isCurrentUser && (
              <span className="ml-2 text-xs font-normal text-zinc-500">(You)</span>
            )}
          </p>
          {email && (
            <p className="mt-0.5 text-xs text-zinc-500">{email}</p>
          )}
          {age && (
            <p className="text-xs text-zinc-500">{age} years old</p>
          )}
          <p className="mt-0.5 text-xs text-emerald-500">Online</p>
        </div>
        <div className="flex flex-col gap-2">
          {!isCurrentUser && (
            <>
              {renderFriendshipButton()}
              <button onClick={handleChat} className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Nhắn tin
              </button>
            </>
          )}
          <div className="flex justify-end">
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
