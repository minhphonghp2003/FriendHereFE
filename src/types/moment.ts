import type { ImageDto } from "./user";

export type MomentVisibility = "OnlyMe" | "Friends" | "BestFriend" | "Lover" | "Public";

export const MOMENT_VISIBILITY_VALUES: Record<MomentVisibility, number> = {
  OnlyMe: 0,
  Friends: 1,
  BestFriend: 2,
  Lover: 3,
  Public: 4,
};

const MOMENT_VISIBILITY_BY_VALUE: Record<number, MomentVisibility> = {
  0: "OnlyMe",
  1: "Friends",
  2: "BestFriend",
  3: "Lover",
  4: "Public",
};

export const toMomentVisibility = (value: number | string | undefined): MomentVisibility => {
  if (typeof value === "string" && value in MOMENT_VISIBILITY_VALUES) {
    return value as MomentVisibility;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return MOMENT_VISIBILITY_BY_VALUE[numeric] ?? "Friends";
};

export type MomentStatus = "Processing" | "Success";

export const MOMENT_STATUS_VALUES: Record<MomentStatus, number> = {
  Processing: 0,
  Success: 1,
};

const MOMENT_STATUS_BY_VALUE: Record<number, MomentStatus> = {
  0: "Processing",
  1: "Success",
};

export const toMomentStatus = (value: number | string | undefined): MomentStatus => {
  if (typeof value === "string" && value in MOMENT_STATUS_VALUES) {
    return value as MomentStatus;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  return MOMENT_STATUS_BY_VALUE[numeric] ?? "Success";
};

export interface MomentLocationDto {
  latitude: number;
  longitude: number;
  placeName: string | null;
  isShowed: boolean;
}

export interface MomentImage {
  originalUrl: string;
  thumbUrl: string;
}

export interface VideoDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface MomentReactionDto {
  userId: number;
  emoji: string;
}

export interface GroupedReactionDto {
  userId: number;
  userName: string;
  userImage: ImageDto | null;
  emojis: string[];
}

export interface MomentDto {
  id: number;
  userId: number;
  userName: string;
  userImage: ImageDto | null;
  caption: string | null;
  status: MomentStatus;
  visibility: MomentVisibility;
  allowComment: boolean;
  location: MomentLocationDto | null;
  images: MomentImage[];
  video: VideoDto | null;
  reactions: MomentReactionDto[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMomentInput {
  caption?: string;
  visibility?: MomentVisibility;
  allowComment?: boolean;
  isShowLocation?: boolean;
  excludedUserIds?: string;
  images?: File[];
  video?: File;
}

export interface CreateMomentRequest {
  caption?: string;
  visibility?: number;
  allowComment?: boolean;
  isShowLocation?: boolean;
  excludedUserIds?: string | null;
  imageFileIds: string[] | null;
  videoFileId: string | null;
}

export interface UpdateMomentInput {
  caption?: string;
  visibility?: MomentVisibility | null;
  allowComment?: boolean;
  excludedUserIds?: number[] | null;
}

export interface MomentReactionNotification {
  momentId: number;
  userId: number;
  userName: string;
  userImage: { originalUrl: string; thumbUrl: string } | null;
  emoji: string;
}
