import { httpClient } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { User } from "../types";

export const getUsers = async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
  const { data } = await httpClient.get<ApiResponse<PaginatedResponse<User>>>("/users", { params });
  return data.data;
};

export const getUserById = async (id: string): Promise<User> => {
  const { data } = await httpClient.get<ApiResponse<User>>(`/users/${id}`);
  return data.data;
};
