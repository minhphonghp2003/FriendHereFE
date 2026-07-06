import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User, WalkInUser, WalkInInput, UpdateUserInput } from "@/types/user";

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

export const createWalkIn = async (input: WalkInInput): Promise<WalkInUser> => {
  const { data } = await httpClient.post<ApiResponse<WalkInUser>>("/WalkIn", input);
  return data.data;
};

export const deleteWalkIn = async (id: number): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/WalkIn/${id}`);
};
