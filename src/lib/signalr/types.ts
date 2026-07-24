export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface LocationDto {
  id: string;
  userId: number;
  name: string;
  image: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  updatedAt: string;
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
