export type MomentVisibility = "OnlyMe" | "Friends" | "Lover" | "Public";

export interface MomentLocation {
  latitude: number;
  longitude: number;
  placeName: string;
  isShowed: boolean;
}

export interface MomentImage {
  originalUrl: string;
  thumbUrl: string;
}

export interface MomentDto {
  id: number;
  userId: number;
  caption: string | null;
  visibility: MomentVisibility;
  allowComment: boolean;
  location: MomentLocation | null;
  images: MomentImage[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMomentInput {
  caption?: string;
  visibility?: MomentVisibility;
  allowComment?: boolean;
  excludedUserIds?: string;
  images?: File[];
}

export interface UpdateMomentInput {
  caption?: string;
  visibility?: MomentVisibility | null;
  allowComment?: boolean;
  excludedUserIds?: number[] | null;
}
