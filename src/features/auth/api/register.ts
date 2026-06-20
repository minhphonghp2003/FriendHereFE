import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, AuthUser, RegisterInput } from "../types";

export const register = async (input: RegisterInput): Promise<{ user: AuthUser; tokens: AuthTokens }> => {
  const { data } = await httpClient.post<ApiResponse<{ user: AuthUser; tokens: AuthTokens }>>("/auth/register", input);
  return data.data;
};
