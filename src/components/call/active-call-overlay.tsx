"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import type { CallPeer } from "@/types/call";

interface Props {
  peer: CallPeer;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micMuted: boolean;
  cameraOff: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
}

const formatDuration = (total: number): string => {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const ActiveCallOverlay = ({
  peer,
  localStream,
  remoteStream,
  micMuted,
  cameraOff,
  onToggleMic,
  onToggleCamera,
  onEnd,
}: Props) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-black">
      <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full flex-1 object-cover" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold text-white">{peer.name}</p>
          <span className="text-xs text-white/70">{formatDuration(seconds)}</span>
        </div>
      </div>
      <div className="absolute right-4 top-16 z-10 h-40 w-28 overflow-hidden rounded-xl border border-white/30 shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-8 bg-gradient-to-t from-black/70 to-transparent p-8 pb-12">
        <button
          onClick={onToggleMic}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg ${micMuted ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"}`}
          aria-label="Tắt tiếng"
        >
          {micMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
        <button
          onClick={onToggleCamera}
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg ${cameraOff ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"}`}
          aria-label="Tắt camera"
        >
          {cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </button>
        <button
          onClick={onEnd}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-500"
          aria-label="Kết thúc cuộc gọi"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
