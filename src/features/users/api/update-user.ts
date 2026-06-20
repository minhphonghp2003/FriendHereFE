import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User, UpdateUserInput } from "../types";

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const { data } = await httpClient.put<ApiResponse<User>>(`/users/${id}`, input);
  return data.data;
};
