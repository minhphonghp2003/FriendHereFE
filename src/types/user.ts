export interface ImageDto {
  originalUrl: string;
  thumbUrl: string;
}

export interface FriendshipStatusDto {
  friendshipId: number;
  status: string | number;
  type?: string | number;
  type1?: string | number;
  type2?: string | number;
  requestedById: number;
  blockedById?: number | null;
}

export interface User {
  id: number;
  name: string;
  images: ImageDto[] | null;
  email: string;
  age: number;
  genderId: number;
  friendship?: FriendshipStatusDto | null;
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
