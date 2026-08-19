import type { ImageDto } from "@/types/chat";

export interface IncomingCallData {
  callerUserId: number;
  callerName: string;
  callerImage: ImageDto | null;
  /** Unique call identifier — used for all signaling and call management. */
  callId: string;
  /** true for video calls, false for voice. */
  hasVideo: boolean;
  startedAt: string;
}

/** Hub method parameter - aligned with actual implementation. */
export interface CallRequestDto {
  targetUserId: number;
  hasVideo?: boolean;
}

export type CallSignalType = "offer" | "answer" | "ice" | "reject" | "cancel" | "end";

/** Unified signal interface for both sending and receiving. */
export interface CallSignalDto {
  callId: string;           // Unique call identifier
  type: CallSignalType;     // Signal type
  payload: string | null;   // SDP or ICE candidate data
  senderId?: number;        // Sender user ID (for received signals)
  senderName?: string;      // Sender name (for received signals)
}

export interface CallPeer {
  userId: number;
  name: string;
  image: ImageDto | null;
  /** Unique call identifier — used for signaling. */
  callId: string;
  /** true for video calls, false for voice. */
  hasVideo: boolean;
}

/** WebRTC signaling state. */
export interface WebRTCState {
  localDescription: RTCSessionDescriptionInit | null;
  remoteDescription: RTCSessionDescriptionInit | null;
  iceCandidates: RTCIceCandidateInit[];
  signalingState: RTCSignalingState;
  iceConnectionState: RTCIceConnectionState;
  connectionState: RTCPeerConnectionState;
}
