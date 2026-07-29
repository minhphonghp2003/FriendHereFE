"use client";

import { useMemo, useState } from "react";
import { Trash2, EyeOff, Users, Heart, Globe, MapPin, MoreHorizontal } from "lucide-react";
import { MomentImageCarousel } from "./moment-image-carousel";
import { ReactionBottomSheet } from "./reaction-bottom-sheet";
import { Button } from "@/components/ui/button";
import { useDeleteMoment } from "@/hooks/moments";
import { addMomentReaction } from "@/services/moment";
import type { MomentDto, MomentVisibility } from "@/types/moment";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

interface MomentCardProps {
  moment: MomentDto;
  currentUserId?: number;
  onDelete?: (id: number) => void;
}

const visibilityConfig: Record<MomentVisibility, { icon: typeof EyeOff; label: string }> = {
  OnlyMe: { icon: EyeOff, label: "Chỉ tôi" },
  Friends: { icon: Users, label: "Bạn bè" },
  Lover: { icon: Heart, label: "Người yêu" },
  Public: { icon: Globe, label: "Công khai" },
};

export const MomentCard = ({ moment, currentUserId, onDelete }: MomentCardProps) => {
  const { mutate: deleteMoment, isLoading: deleting } = useDeleteMoment();
  const [showMenu, setShowMenu] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const isOwner = currentUserId === moment.userId;

  const groupedReactions = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of moment.reactions) {
      const list = map.get(r.emoji) ?? [];
      list.push(r.userId);
      map.set(r.emoji, list);
    }
    return Array.from(map.entries()).map(([emoji, userIds]) => ({ emoji, userIds, count: userIds.length }));
  }, [moment.reactions]);

  const handleReact = (emoji: string) => {
    setReactingEmoji(emoji);
    addMomentReaction(moment.id, emoji).finally(() => setReactingEmoji(null));
  };

  const handleDelete = async () => {
    try {
      await deleteMoment(moment.id);
      onDelete?.(moment.id);
    } catch {}
    setShowMenu(false);
  };

  const visConfig = visibilityConfig[moment.visibility] || visibilityConfig.Friends;
  const VisIcon = visConfig.icon;
  const displayName = isOwner ? "Bạn" : moment.userName;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {moment.userImage ? (
            <img
              src={moment.userImage.thumbUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            displayName.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{displayName}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <VisIcon className="h-3 w-3" />
            <span>{visConfig.label}</span>
            <span>·</span>
            <span>{new Date(moment.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {isOwner && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border border-border bg-background shadow-md">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Đang xóa..." : "Xóa"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {moment.caption && (
        <p className="px-3 pb-2 text-sm">{moment.caption}</p>
      )}

      {moment.images.length > 0 && (
        <MomentImageCarousel images={moment.images} />
      )}

      {moment.location?.isShowed && (
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{moment.location.placeName || `${moment.location.latitude.toFixed(4)}, ${moment.location.longitude.toFixed(4)}`}</span>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-border px-3 py-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={reactingEmoji === emoji}
            className="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-muted disabled:opacity-50"
          >
            {emoji}
          </button>
        ))}
      </div>

      {groupedReactions.length > 0 && (
        <button
          onClick={() => setShowReactions(true)}
          className="flex w-full flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-left hover:bg-muted/50"
        >
          {groupedReactions.map((g) => (
            <span
              key={g.emoji}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span>{g.emoji}</span>
              <span className="font-medium tabular-nums text-muted-foreground">{g.count}</span>
            </span>
          ))}
          
        </button>
      )}

      <ReactionBottomSheet
        momentId={moment.id}
        open={showReactions}
        onClose={() => setShowReactions(false)}
      />
    </div>
  );
};
