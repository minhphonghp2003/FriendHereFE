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

export const uploadAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post<ApiResponse<User>>("/User/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
};
