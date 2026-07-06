export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  age: number;
  genderId: number;
}

export interface EscalateInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: number;
  name: string;
  email: string;
  token: string;
  expiresAt: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}
