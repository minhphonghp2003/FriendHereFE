"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  REFRESH_TOKEN_EXPIRES_AT_KEY,
  USER_ID_KEY,
  USER_INFO_KEY,
} from "@/constants";
import { LoadingVideo } from "@/components/common/loading-video";
import { syncFcmTokenAfterAuth } from "@/lib/fcm";

function decodeJWT(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const expiresAt = params.get("expiresAt");
    const refreshTokenExpiresAt = params.get("refreshTokenExpiresAt");
    const error = params.get("error");

    if (error || !token) {
      router.replace(error ? `/init?error=${encodeURIComponent(error)}` : "/init");
      return;
    }

    const payload = decodeJWT(token);
    if (!payload) {
      router.replace("/init");
      return;
    }

    const user = {
      id: Number(payload.sub),
      name: payload.name ?? "",
      email: payload.email ?? "",
    };

    // Store all tokens in localStorage
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    }
    if (refreshTokenExpiresAt) {
      localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT_KEY, refreshTokenExpiresAt);
    }

    localStorage.setItem(USER_ID_KEY, String(user.id));
    localStorage.setItem(USER_INFO_KEY, JSON.stringify({ name: user.name, email: user.email }));

    // Update auth state with all token information
    login(
      user,
      token,
      refreshToken || undefined,
      expiresAt || undefined,
      refreshTokenExpiresAt || undefined,
    );

    // OAuth login doesn't carry an fcmToken — register the device token via
    // PUT /fcm-token (prompts for notification permission if needed).
    void syncFcmTokenAfterAuth();

    router.replace("/home");
  }, [router, login]);

  return (
    <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center">
      <LoadingVideo size="md" />
    </div>
  );
}
