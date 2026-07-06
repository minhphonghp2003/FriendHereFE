import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse, LoginInput, RegisterInput, EscalateInput } from "@/types/auth";

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>("/Auth/login", input);
  return data.data;
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>("/Auth/register", input);
  return data.data;
};

export const escalate = async (userId: number, input: EscalateInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>(`/Auth/escalate/${userId}`, input);
  return data.data;
};

export const logout = async (): Promise<void> => {
  await httpClient.post("/auth/logout");
};
