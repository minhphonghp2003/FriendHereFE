import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User, UpdateUserInput } from "../types";

export const updateCurrentUser = async (input: UpdateUserInput): Promise<User> => {
  const { data } = await httpClient.put<ApiResponse<User>>("/User/me", input);
  return data.data;
};
