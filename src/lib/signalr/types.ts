import type { MomentDto } from "@/types/moment";

export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export const LOCATION_VISIBILITY_VALUES = {
  OnlyMe: 0,
  Friends: 1,
  BestFriend: 2,
  Lover: 3,
  Public: 4,
} as const;

export type LocationVisibilityValue =
  (typeof LOCATION_VISIBILITY_VALUES)[keyof typeof LOCATION_VISIBILITY_VALUES];

export const LOCATION_VISIBILITY_LABELS: Record<LocationVisibilityValue, string> = {
  [LOCATION_VISIBILITY_VALUES.OnlyMe]: "Chỉ mình tôi",
  [LOCATION_VISIBILITY_VALUES.Friends]: "Bạn bè",
  [LOCATION_VISIBILITY_VALUES.BestFriend]: "Bạn thân",
  [LOCATION_VISIBILITY_VALUES.Lover]: "Người yêu",
  [LOCATION_VISIBILITY_VALUES.Public]: "Công khai",
};

export interface LocationDto {
  id: string;
  userId: number;
  name: string;
  image: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  battery: number | null;
  status: string | null;
  visibility: number;
  updatedAt: string;
  moments: MomentDto[] | null;
}

export interface ActiveUserDto {
  userId: number;
  name: string;
  image: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  battery: number | null;
  status: string | null;
  updatedAt: string;
  distance: number | null;
}

export interface JoinRequest {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
}

export interface UserDto {
  id: number;
  name: string;
  images: ImageDto[] | null;
  email: string;
  age: number;
  genderId: number;
}
