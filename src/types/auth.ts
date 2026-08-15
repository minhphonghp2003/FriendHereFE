export interface LoginInput {
  email: string;
  password: string;
  /** FCM device token (optional) — server stores/updates it for push. */
  fcmToken?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  age: number;
  genderId: number;
  /** FCM device token (optional) — send right after signup to enable push. */
  fcmToken?: string;
}

export interface AuthResponse {
  userId: number;
  name: string;
  email: string;
  token: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}
