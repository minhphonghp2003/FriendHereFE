import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User, UpdateUserInput } from "@/types/user";

export const getUserById = async (id: number): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>(`/User/${id}`);
  return data.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>("/User/me");
  return data.data;
};

export const updateCurrentUser = async (input: UpdateUserInput): Promise<User> => {
  const { data } = await httpClient.put<ApiResponse<User>>("/User/me", input);
  return data.data;
};

export const setAvatar = async (fileId: string): Promise<User> => {
  const { data } = await httpClient.post<ApiResponse<User>>("/User/me/avatar", { fileId });
  return data.data;
};
