"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { appHub } from "@/lib/signalr/app-hub";
import { callAudio } from "@/lib/call-audio";
import { IncomingCallOverlay } from "@/components/call/incoming-call-overlay";
import { OutgoingCallOverlay } from "@/components/call/outgoing-call-overlay";
import { ActiveCallOverlay } from "@/components/call/active-call-overlay";
import type { ImageDto } from "@/types/chat";
import type { CallPeer, CallSignalData, IncomingCallData } from "@/types/call";

type CallStatus = "idle" | "incoming" | "outgoing" | "active";

interface CallContextValue {
  startCall: (
    targetUserId: number,
    name?: string,
    image?: ImageDto | null,
    hasVideo?: boolean,
  ) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const statusRef = useRef<CallStatus>("idle");
  const peerRef = useRef<CallPeer | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offeredSdpRef = useRef<RTCSessionDescriptionInit | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const showNotice = useCallback((text: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(text);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2500);
  }, []);

  const cleanup = useCallback(() => {
    callAudio.stop();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    offeredSdpRef.current = null;
    peerRef.current = null;
    setPeer(null);
    setLocalStream(null);
    setRemoteStream(null);
    setMicMuted(false);
    setCameraOff(false);
    setStatus("idle");
  }, []);

  const flushCandidates = useCallback((pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    pending.forEach((c) => pc.addIceCandidate(c).catch(console.error));
  }, []);

  const createPeer = useCallback(
    (targetUserId: number) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          appHub
            .sendCallSignal({ targetUserId, type: "ice", payload: JSON.stringify(e.candidate) })
            .catch(console.error);
        }
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" && statusRef.current === "active") {
          cleanup();
          showNotice("Mất kết nối cuộc gọi");
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [cleanup, showNotice],
  );

  const getLocalMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const addLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }, []);

  const startCall = useCallback(
    async (targetUserId: number, name = "", image: ImageDto | null = null, hasVideo = true) => {
      if (statusRef.current !== "idle") return;
      const newPeer: CallPeer = { userId: targetUserId, name, image, hasVideo };
      peerRef.current = newPeer;
      setPeer(newPeer);
      setStatus("outgoing");
      callAudio.play();
      try {
        const stream = await getLocalMedia();
        const pc = createPeer(targetUserId);
        addLocalTracks(pc, stream);
        await appHub.call(targetUserId, hasVideo);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await appHub.sendCallSignal({
          targetUserId,
          type: "offer",
          payload: JSON.stringify(offer),
        });
      } catch (err) {
        console.error("Failed to start call", err);
        cleanup();
        showNotice("Không thể bắt đầu cuộc gọi");
      }
    },
    [getLocalMedia, createPeer, addLocalTracks, cleanup, showNotice],
  );

  const acceptCall = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer || statusRef.current !== "incoming") return;
    try {
      const stream = await getLocalMedia();
      const pc = createPeer(peer.userId);
      addLocalTracks(pc, stream);
      if (!offeredSdpRef.current) throw new Error("No offer received");
      await pc.setRemoteDescription(new RTCSessionDescription(offeredSdpRef.current));
      flushCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await appHub.sendCallSignal({
        targetUserId: peer.userId,
        type: "answer",
        payload: JSON.stringify(answer),
      });
      callAudio.stop();
      setStatus("active");
    } catch (err) {
      console.error("Failed to accept call", err);
      cleanup();
      showNotice("Không thể nhận cuộc gọi");
    }
  }, [getLocalMedia, createPeer, addLocalTracks, flushCandidates, cleanup, showNotice]);

  const rejectCall = useCallback(() => {
    const peer = peerRef.current;
    if (peer) {
      appHub
        .sendCallSignal({ targetUserId: peer.userId, type: "reject", payload: null })
        .catch(console.error);
    }
    cleanup();
  }, [cleanup]);

  const cancelCall = useCallback(() => {
    const peer = peerRef.current;
    if (peer) {
      appHub
        .sendCallSignal({ targetUserId: peer.userId, type: "cancel", payload: null })
        .catch(console.error);
    }
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(() => {
    const peer = peerRef.current;
    if (peer) {
      appHub
        .sendCallSignal({ targetUserId: peer.userId, type: "end", payload: null })
        .catch(console.error);
    }
    cleanup();
    showNotice("Cuộc gọi đã kết thúc");
  }, [cleanup, showNotice]);

  const toggleMic = useCallback(() => {
    const next = !micMuted;
    setMicMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }, [micMuted]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOff;
    setCameraOff(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  }, [cameraOff]);

  useEffect(() => {
    const unsubCall = appHub.onReceiveCall((data) => {
      if (statusRef.current !== "idle") return;
      const newPeer: CallPeer = {
        userId: data.callerUserId,
        name: data.callerName,
        image: data.callerImage,
        callId: data.callId,
        hasVideo: data.hasVideo,
      };
      peerRef.current = newPeer;
      setPeer(newPeer);
      setStatus("incoming");
      callAudio.play();
    });

    const unsubSignal = appHub.onReceiveCallSignal(async (data: CallSignalData) => {
      const peer = peerRef.current;
      if (!peer || data.userId !== peer.userId) return;
      switch (data.type) {
        case "offer":
          if (statusRef.current === "incoming" && data.payload) {
            offeredSdpRef.current = JSON.parse(data.payload);
          }
          break;
        case "answer":
          if (pcRef.current && pcRef.current.signalingState === "have-local-offer") {
            try {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(data.payload ?? "{}")),
              );
              flushCandidates(pcRef.current);
              callAudio.stop();
              setStatus("active");
            } catch (err) {
              console.error("Failed to handle answer", err);
            }
          }
          break;
        case "ice":
          if (data.payload) {
            try {
              const candidate = JSON.parse(data.payload);
              if (pcRef.current && pcRef.current.remoteDescription) {
                pcRef.current.addIceCandidate(candidate).catch(console.error);
              } else {
                pendingCandidatesRef.current.push(candidate);
              }
            } catch (err) {
              console.error("Failed to handle ICE candidate", err);
            }
          }
          break;
        case "reject":
          cleanup();
          showNotice("Đã từ chối cuộc gọi");
          break;
        case "cancel":
          cleanup();
          showNotice("Đã hủy cuộc gọi");
          break;
        case "end":
          cleanup();
          showNotice("Cuộc gọi đã kết thúc");
          break;
      }
    });

    return () => {
      unsubCall();
      unsubSignal();
    };
  }, [cleanup, flushCandidates, showNotice]);

  const renderOverlay = () => {
    if (status === "incoming" && peer) {
      return <IncomingCallOverlay peer={peer} onAccept={acceptCall} onReject={rejectCall} />;
    }
    if (status === "outgoing" && peer) {
      return <OutgoingCallOverlay peer={peer} onCancel={cancelCall} />;
    }
    if (status === "active" && peer) {
      return (
        <ActiveCallOverlay
          peer={peer}
          localStream={localStream}
          remoteStream={remoteStream}
          micMuted={micMuted}
          cameraOff={cameraOff}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onEnd={endCall}
        />
      );
    }
    return null;
  };

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}
      {renderOverlay()}
      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[80] flex justify-center">
          <div className="animate-in fade-in-0 zoom-in-95 bg-foreground/90 text-background rounded-full px-4 py-2 text-sm font-medium shadow-lg duration-200">
            {notice}
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};
