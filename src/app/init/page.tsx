"use client";

import Link from "next/link";
import { env } from "@/config/env";
import { Button } from "@/components/ui/button";
import { LogIn, User } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export default function InitPage() {
  const handleOAuth = (provider: string) => {
    console.log(`[OAuth] ${provider} login clicked`);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-primary shadow-lg shadow-primary/25">
            <span className="text-3xl font-bold text-primary-foreground">
              {env.NEXT_PUBLIC_APP_NAME.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Real-time chat and location tracking
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-6 pb-12">
        <Button
          variant="outline"
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border-zinc-300 bg-white text-sm font-medium hover:bg-zinc-50"
          onClick={() => handleOAuth("google")}
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </Button>

        <Button
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] text-sm font-medium text-white hover:bg-[#1877F2]/90"
          onClick={() => handleOAuth("facebook")}
        >
          <FacebookIcon />
          <span>Continue with Facebook</span>
        </Button>

        <Button
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-black text-sm font-medium text-white hover:bg-black/90"
          onClick={() => handleOAuth("apple")}
        >
          <AppleIcon />
          <span>Continue with Apple</span>
        </Button>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground">or</span>
          </div>
        </div>

        <Link href="/login" className="w-full">
          <Button
            variant="outline"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl"
          >
            <LogIn className="h-5 w-5" />
            <span>Log in with email</span>
          </Button>
        </Link>

        <p className="mt-1 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Register
          </Link>
        </p>

        <Link href="/walk-in" className="w-full">
          <Button
            variant="secondary"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl"
          >
            <User className="h-5 w-5" />
            <span>Continue as guest</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
