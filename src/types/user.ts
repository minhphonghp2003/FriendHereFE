export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface User {
  id: number;
  name: string;
  images: ImageDto[] | null;
  email: string;
  age: number;
  genderId: number;
  isWalkIn: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  age: number;
  genderId: number;
}

export interface UpdateUserInput {
  name?: string;
  age?: number;
  genderId?: number;
}

export interface WalkInInput {
  name: string;
  age: number;
  genderId: number;
}

export interface WalkInUser {
  id: number;
  name: string;
  email: string | null;
  passwordHash: string | null;
  images: ImageDto[] | null;
  age: number;
  genderId: number;
  isWalkIn: true;
}
