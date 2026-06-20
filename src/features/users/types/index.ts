export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role?: "admin" | "user";
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: "admin" | "user";
}
