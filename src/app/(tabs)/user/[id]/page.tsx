"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Loader2, ImageIcon } from "lucide-react";
import { useUser } from "@/hooks/users/use-users";
import { useUserMoments } from "@/hooks/moments/use-user-moments";
import { useAuth } from "@/providers/auth-provider";
import { MomentDetailOverlay } from "@/components/moments/moment-detail-overlay";
import { getOpponentConversation } from "@/services/chat";
import { isVideoUrl } from "@/types/chat";
import type { MomentDto } from "@/types/moment";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);
  const { user: currentUser } = useAuth();
  const { data: userProfile, isLoading } = useUser(userId);
  const [viewMomentId, setViewMomentId] = useState<number | null>(null);

  const {
    data: moments,
    isLoading: loadingMoments,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useUserMoments(userId, 20);

  const isSelf = currentUser?.id === userId;

  const handleMessage = useCallback(async () => {
    try {
      const res = await getOpponentConversation(userId);
      if (res.data) {
        router.push(`/chat/${res.data}`);
      } else {
        router.push(`/chat/new?receiverId=${userId}&name=${encodeURIComponent(userProfile?.name ?? "")}`);
      }
    } catch {
      router.push(`/chat/new?receiverId=${userId}&name=${encodeURIComponent(userProfile?.name ?? "")}`);
    }
  }, [userId, userProfile, router]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col">
        <div className="flex items-center gap-3 border-b border-border p-3">
          <button onClick={() => router.back()} className="rounded p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Không tìm thấy người dùng</p>
        </div>
      </div>
    );
  }

  const avatar = userProfile.images?.[0]?.originalUrl ?? userProfile.images?.[0]?.thumbUrl;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <button onClick={() => router.back()} className="rounded p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="flex-1 truncate font-semibold">
          {isSelf ? "Hồ sơ của bạn" : userProfile.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-3 p-6">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
            {avatar ? (
              <img src={avatar} alt={userProfile.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {userProfile.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{userProfile.name}</p>
            {userProfile.email && (
              <p className="text-sm text-muted-foreground">{userProfile.email}</p>
            )}
            {userProfile.age != null && (
              <p className="text-sm text-muted-foreground">{userProfile.age} tuổi</p>
            )}
          </div>
          {!isSelf && (
            <button
              onClick={handleMessage}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <MessageCircle className="h-4 w-4" />
              Nhắn tin
            </button>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Khoảnh khắc</p>
          {loadingMoments && moments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : moments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="mb-2 h-10 w-10" />
              <p className="text-sm">Chưa có khoảnh khắc nào</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1">
                {moments.map((moment: MomentDto) => {
                  const firstImage = moment.images?.[0];
                  const thumb = firstImage?.thumbUrl ?? firstImage?.originalUrl;
                  const hasVideo = moment.images?.some((img) => isVideoUrl(img.originalUrl));
                  return (
                    <button
                      key={moment.id}
                      onClick={() => setViewMomentId(moment.id)}
                      className="relative aspect-square overflow-hidden rounded-md bg-muted"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      {hasVideo && (
                        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60">
                          <span className="ml-0.5 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
                  >
                    {isLoadingMore ? "Đang tải..." : "Xem thêm"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MomentDetailOverlay
        momentId={viewMomentId}
        currentUserId={currentUser?.id}
        onClose={() => setViewMomentId(null)}
      />
    </div>
  );
}