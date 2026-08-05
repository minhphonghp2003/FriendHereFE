"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { getMomentById } from "@/services/moment";
import { MomentCard } from "./moment-card";
import type { MomentDto } from "@/types/moment";

interface MomentDetailOverlayProps {
  momentId: number | null;
  currentUserId?: number;
  onClose: () => void;
  hideTimelineChip?: boolean;
}

export const MomentDetailOverlay = ({
  momentId,
  currentUserId,
  onClose,
  hideTimelineChip,
}: MomentDetailOverlayProps) => {
  const [moment, setMoment] = useState<MomentDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    if (!momentId) return;
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    setMoment(null);
    setShowInfo(true);
    getMomentById(momentId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setMoment(res.data);
        } else {
          setUnavailable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [momentId]);

  useEffect(() => {
    if (!momentId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [momentId, onClose]);

  if (!momentId) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        aria-label="Đóng"
      >
        <X className="h-5 w-5" />
      </button>
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : unavailable ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-white/70">Khoảnh khắc không khả dụng</p>
        </div>
      ) : moment ? (
        <div className="flex-1">
          <MomentCard
            fullscreen
            moment={moment}
            currentUserId={currentUserId}
            showInfo={showInfo}
            onToggleInfo={() => setShowInfo((v) => !v)}
            hideTimelineChip={hideTimelineChip}
            onDelete={onClose}
            onHide={onClose}
          />
        </div>
      ) : null}
    </div>
  );
};
