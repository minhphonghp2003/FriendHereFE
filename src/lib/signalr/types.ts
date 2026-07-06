export interface LocationDto {
  id: string;
  userId: number;
  name: string;
  image: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  updatedAt: string;
}

export interface UserDto {
  id: number;
  name: string;
  image: string;
  email: string;
  age: number;
  genderId: number;
  isWalkIn: boolean;
}

export interface JoinLocationInput {
  userId: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
}
