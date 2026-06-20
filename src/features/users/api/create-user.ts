import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { User, CreateUserInput } from "../types";

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const { data } = await httpClient.post<ApiResponse<User>>("/users", input);
  return data.data;
};
