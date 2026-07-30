import type { ImageDto } from "./user";

export type MomentVisibility = "OnlyMe" | "Friends" | "Lover" | "Public";

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
  visibility: MomentVisibility;
  allowComment: boolean;
  location: MomentLocationDto | null;
  images: MomentImage[];
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
