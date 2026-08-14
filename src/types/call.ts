import type { ImageDto } from "@/types/chat";

export interface IncomingCallData {
  callerUserId: number;
  callerName: string;
  callerImage: ImageDto | null;
  /** Unique call identifier — matches call.ended push's callId. */
  callId: string;
  /** true for video calls, false for voice. */
  hasVideo: boolean;
  startedAt: string;
}

/** Hub method parameter (BE now sends `hasVideo` for voice/video distinction). */
export interface CallRequestDto {
  targetUserId: number;
  hasVideo?: boolean;
}

export type CallSignalType = "offer" | "answer" | "ice" | "reject" | "cancel" | "end";

export interface CallSignalDto {
  targetUserId: number;
  type: CallSignalType;
  payload: string | null;
}

export interface CallSignalData {
  userId: number;
  userName: string;
  type: CallSignalType;
  payload: string | null;
}

export interface CallPeer {
  userId: number;
  name: string;
  image: ImageDto | null;
  /** Unique call identifier — matches BE push's callId. */
  callId?: string;
  /** true for video calls, false for voice. */
  hasVideo?: boolean;
}
