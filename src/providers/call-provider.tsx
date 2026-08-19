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
import type { CallPeer, CallSignalDto, IncomingCallData } from "@/types/call";

type CallStatus = "idle" | "incoming" | "outgoing" | "active" | "reconnecting" | "failed";

interface CallContextValue {
  startCall: (
    targetUserId: number,
    name?: string,
    image?: ImageDto | null,
    hasVideo?: boolean,
  ) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Add fallback STUN servers
    { urls: "stun:stun.services.mozilla.com:3478" },
    { urls: "stun:stun.cloudflare.com:3478" },
    // TODO: Add TURN servers for production
    // { urls: "turn:your-turn-server.com:3478", username: "user", credential: "pass" },
  ],
  iceCandidatePoolSize: 10,
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
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor" | "unknown">("unknown");

  const statusRef = useRef<CallStatus>("idle");
  const peerRef = useRef<CallPeer | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offeredSdpRef = useRef<RTCSessionDescriptionInit | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentCallIdRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (status === "active") {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [status]);

  const showNotice = useCallback((text: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(text);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2500);
  }, []);

  const cleanup = useCallback(() => {
    callAudio.stop();
    
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        t.stop();
        t.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    // Clean up refs and state
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    offeredSdpRef.current = null;
    peerRef.current = null;
    currentCallIdRef.current = null;
    reconnectAttemptsRef.current = 0;
    
    // Reset state
    setPeer(null);
    setLocalStream(null);
    setRemoteStream(null);
    setMicMuted(false);
    setCameraOff(false);
    setCallDuration(0);
    setConnectionQuality("unknown");
    setStatus("idle");
  }, []);

  const flushCandidates = useCallback((pc: RTCPeerConnection) => {
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    pending.forEach((c) => pc.addIceCandidate(c).catch(console.error));
  }, []);

  const createPeer = useCallback(
    (callId: string) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      
      // ICE candidate handling with retry logic
      pc.onicecandidate = (e) => {
        if (e.candidate && currentCallIdRef.current) {
          appHub
            .sendCallSignal({
              callId: currentCallIdRef.current,
              type: "ice",
              payload: JSON.stringify(e.candidate),
            })
            .catch((error) => {
              console.error("Failed to send ICE candidate:", error);
              // Retry logic for ICE candidates
              setTimeout(() => {
                if (currentCallIdRef.current) {
                  appHub.sendCallSignal({
                    callId: currentCallIdRef.current,
                    type: "ice",
                    payload: JSON.stringify(e.candidate),
                  }).catch(console.error);
                }
              }, 1000);
            });
        }
      };

      // Remote track handling
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        
        // Update connection quality based on track stats
        if (e.track && e.track.readyState === "live") {
          setConnectionQuality("excellent");
        }
      };

      // Connection state monitoring with recovery
      pc.onconnectionstatechange = () => {
        const currentState = pc.connectionState;
        console.log("Connection state changed:", currentState);

        switch (currentState) {
          case "connected":
            setConnectionQuality("excellent");
            reconnectAttemptsRef.current = 0;
            break;
          case "disconnected":
            if (statusRef.current === "active") {
              setStatus("reconnecting");
              showNotice("Đang kết nối lại...");
              
              // Attempt reconnection with exponential backoff
              const attemptReconnect = async (attempt: number) => {
                if (attempt > 3) {
                  setStatus("failed");
                  cleanup();
                  showNotice("Không thể kết nối lại");
                  return;
                }

                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                if (pc.connectionState === "disconnected") {
                  console.log(`Reconnection attempt ${attempt + 1}`);
                  // Create new offer for reconnection
                  try {
                    const offer = await pc.createOffer({ iceRestart: true });
                    await pc.setLocalDescription(offer);
                    if (currentCallIdRef.current) {
                      await appHub.sendCallSignal({
                        callId: currentCallIdRef.current,
                        type: "offer",
                        payload: JSON.stringify(offer),
                      });
                    }
                  } catch (error) {
                    console.error("Reconnection failed:", error);
                    await attemptReconnect(attempt + 1);
                  }
                }
              };

              attemptReconnect(0);
            }
            break;
          case "failed":
            if (statusRef.current === "active" || statusRef.current === "reconnecting") {
              setStatus("failed");
              cleanup();
              showNotice("Mất kết nối cuộc gọi");
            }
            break;
          case "closed":
            // Normal call end
            break;
        }
      };

      // ICE connection state monitoring
      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState;
        console.log("ICE connection state:", iceState);

        switch (iceState) {
          case "connected":
          case "completed":
            setConnectionQuality("excellent");
            break;
          case "checking":
            setConnectionQuality("good");
            break;
          case "disconnected":
            setConnectionQuality("poor");
            break;
          case "failed":
            if (statusRef.current === "active") {
              cleanup();
              showNotice("Kết nối ICE thất bại");
            }
            break;
        }
      };

      // Signaling state monitoring
      pc.onsignalingstatechange = () => {
        console.log("Signaling state:", pc.signalingState);
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanup, showNotice],
  );

  const getLocalMedia = useCallback(async (hasVideo: boolean = true) => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: hasVideo ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      } : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Media access error:", error);
      // Fallback to basic constraints if ideal ones fail
      if (hasVideo) {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          localStreamRef.current = fallbackStream;
          setLocalStream(fallbackStream);
          return fallbackStream;
        } catch (fallbackError) {
          throw new Error("Failed to access camera and microphone");
        }
      }
      throw error;
    }
  }, []);

  const addLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }, []);

  const startCall = useCallback(
    async (targetUserId: number, name = "", image: ImageDto | null = null, hasVideo = true) => {
      if (statusRef.current !== "idle") {
        showNotice("Đang có cuộc gọi khác");
        return;
      }

      // Generate unique callId
      const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      currentCallIdRef.current = callId;

      const newPeer: CallPeer = {
        userId: targetUserId,
        name,
        image,
        callId,
        hasVideo,
      };
      
      peerRef.current = newPeer;
      setPeer(newPeer);
      setStatus("outgoing");
      callAudio.play();
      
      try {
        // Get media based on call type
        const stream = await getLocalMedia(hasVideo);
        const pc = createPeer(callId);
        addLocalTracks(pc, stream);
        
        // Initiate call via SignalR
        await appHub.call(targetUserId, hasVideo);
        
        // Create and send offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: hasVideo,
        });
        await pc.setLocalDescription(offer);
        
        // Send offer via SignalR
        await appHub.sendCallSignal({
          callId,
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
    
    currentCallIdRef.current = peer.callId;
    
    try {
      // Get media based on call type
      const stream = await getLocalMedia(peer.hasVideo);
      const pc = createPeer(peer.callId);
      addLocalTracks(pc, stream);
      
      if (!offeredSdpRef.current) {
        throw new Error("No offer received");
      }
      
      // Set remote description from offer
      await pc.setRemoteDescription(new RTCSessionDescription(offeredSdpRef.current));
      flushCandidates(pc);
      
      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await appHub.sendCallSignal({
        callId: peer.callId,
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
        .sendCallSignal({
          callId: peer.callId,
          type: "reject",
          payload: null,
        })
        .catch(console.error);
    }
    cleanup();
  }, [cleanup]);

  const cancelCall = useCallback(() => {
    const peer = peerRef.current;
    if (peer) {
      appHub
        .sendCallSignal({
          callId: peer.callId,
          type: "cancel",
          payload: null,
        })
        .catch(console.error);
    }
    cleanup();
    showNotice("Đã hủy cuộc gọi");
  }, [cleanup, showNotice]);

  const endCall = useCallback(() => {
    const peer = peerRef.current;
    if (peer) {
      appHub
        .sendCallSignal({
          callId: peer.callId,
          type: "end",
          payload: null,
        })
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
      currentCallIdRef.current = data.callId;
      setPeer(newPeer);
      setStatus("incoming");
      callAudio.play();
    });

    const unsubSignal = appHub.onReceiveCallSignal(async (data: CallSignalDto) => {
      const peer = peerRef.current;
      if (!peer || data.callId !== peer.callId) return;
      
      switch (data.type) {
        case "offer":
          if (statusRef.current === "incoming" && data.payload) {
            try {
              offeredSdpRef.current = JSON.parse(data.payload);
            } catch (err) {
              console.error("Failed to parse offer:", err);
            }
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
              if (statusRef.current === "outgoing") {
                cleanup();
                showNotice("Không thể kết nối cuộc gọi");
              }
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
          callDuration={callDuration}
          connectionQuality={connectionQuality}
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
