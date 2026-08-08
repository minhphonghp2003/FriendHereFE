import type { ImageDto } from "@/types/chat";

export interface IncomingCallData {
  callerUserId: number;
  callerName: string;
  callerImage: ImageDto | null;
  startedAt: string;
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
}
