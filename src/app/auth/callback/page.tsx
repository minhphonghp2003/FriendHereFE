"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { TOKEN_KEY, TOKEN_EXPIRES_AT_KEY, USER_ID_KEY, USER_INFO_KEY } from "@/constants";
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
    const expiresAt = params.get("expiresAt");
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

    localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) localStorage.setItem(TOKEN_EXPIRES_AT_KEY, expiresAt);
    localStorage.setItem(USER_ID_KEY, String(user.id));
    localStorage.setItem(USER_INFO_KEY, JSON.stringify({ name: user.name, email: user.email }));

    login(user, token);

    // OAuth login doesn't carry an fcmToken — register the device token via
    // PUT /fcm-token (prompts for notification permission if needed).
    void syncFcmTokenAfterAuth();

    router.replace("/home");
  }, [router, login]);

  return (
    <div className="flex min-h-dvh items-center justify-center safe-top safe-bottom">
      <LoadingVideo size="md" />
    </div>
  );
}
