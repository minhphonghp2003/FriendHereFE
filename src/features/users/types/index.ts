export interface User {
  id: number;
  name: string;
  image: string | null;
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
  image?: string | null;
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
  image: string | null;
  age: number;
  genderId: number;
  isWalkIn: true;
}
