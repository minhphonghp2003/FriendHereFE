import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User } from "../types";

export const getUserById = async (id: number): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>(`/User/${id}`);
  return data.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>("/User/me");
  return data.data;
};
