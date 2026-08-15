"use client";

import { PhoneOff } from "lucide-react";
import type { CallPeer } from "@/types/call";

interface Props {
  peer: CallPeer;
  onCancel: () => void;
}

export const OutgoingCallOverlay = ({ peer, onCancel }: Props) => {
  return (
    <div className="fixed inset-0 z-[75] flex flex-col items-center justify-between bg-black/90 p-8">
      <div className="flex flex-col items-center gap-5 pt-16">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-white/60">
            {peer.image?.originalUrl ? (
              <img
                src={peer.image.originalUrl}
                alt={peer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-white">
                {peer.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-white">{peer.name}</p>
          <p className="mt-1 text-sm text-white/70">Đang gọi...</p>
        </div>
      </div>
      <div className="pb-16">
        <button
          onClick={onCancel}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-500"
          aria-label="Hủy cuộc gọi"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};
