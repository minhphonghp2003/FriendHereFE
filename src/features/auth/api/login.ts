import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, AuthUser, LoginInput } from "../types";

export const login = async (input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> => {
  const { data } = await httpClient.post<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>>("/auth/login", input);
  return data.data;
};
