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
