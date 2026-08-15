import { httpClient } from "@/lib/axios";

interface RefreshTokenRequest {
  token: string;
  deviceInfo?: string;
  ipAddress?: string;
}

interface RefreshTokenResponse {
  token: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

interface TokenResponse {
  data: RefreshTokenResponse;
  message: string;
  statusCode: number;
}

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const { data } = await httpClient.post<TokenResponse>("/Auth/refresh", {
    token: refreshToken,
    deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });
  return data.data;
};

/**
 * Revoke refresh token on logout
 * POST /api/auth/revoke-refresh-token
 */
export const revokeRefreshToken = async (refreshToken: string): Promise<boolean> => {
  const { data } = await httpClient.post<{ data: boolean; message: string; statusCode: number }>(
    "/Auth/revoke-refresh-token",
    {
      token: refreshToken,
    },
  );
  return data.data;
};
