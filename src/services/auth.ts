import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse, LoginInput, RegisterInput } from "@/types/auth";

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>("/Auth/login", input);
  return data.data;
};

export const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const { data } = await httpClient.post<ApiResponse<AuthResponse>>("/Auth/register", input);
  return data.data;
};

/**
 * PUT /api/Auth/fcm-token — sync the FCM device token for the logged-in
 * user. Call whenever Firebase rotates the token (onTokenRefresh) or after
 * permission is granted post-login. Requires Bearer auth.
 */
export const updateFcmToken = async (fcmToken: string): Promise<void> => {
  await httpClient.put<ApiResponse<null>>("/Auth/fcm-token", { fcmToken });
};

export const logoutApi = async (): Promise<void> => {
  await httpClient.post("/auth/logout");
};

export const forgotPassword = async (email: string): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/auth/forgot-password", { email });
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/auth/reset-password", { token, newPassword });
};
