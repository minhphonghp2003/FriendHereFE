"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getMomentReactions } from "@/services/moment";
import type { GroupedReactionDto } from "@/types/moment";

interface ReactionBottomSheetProps {
  momentId: number;
  open: boolean;
  onClose: () => void;
}

export const ReactionBottomSheet = ({ momentId, open, onClose }: ReactionBottomSheetProps) => {
  const [reactions, setReactions] = useState<GroupedReactionDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMomentReactions(momentId)
      .then((res) => {
        setReactions(res.data);
        setTotalCount(res.totalCount);
      })
      .finally(() => setLoading(false));
  }, [momentId, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-background px-4 pb-8 pt-4 shadow-lg">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Reactions ({totalCount})
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : reactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No reactions</p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            {reactions.map((r) => (
              <div key={r.userId} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {r.userImage ? (
                    <img
                      src={r.userImage.thumbUrl}
                      alt={r.userName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    r.userName.charAt(0)
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{r.userName}</span>
                  <div className="flex gap-1">
                    {r.emojis.map((emoji, i) => (
                      <span key={i} className="text-base">{emoji}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
