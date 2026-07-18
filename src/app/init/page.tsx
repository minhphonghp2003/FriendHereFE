"use client";

import Image from "next/image";
import Link from "next/link";
import { LogIn, User } from "lucide-react";

import { env } from "@/config/env";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

type OAuthProvider = "google" | "facebook" | "apple";

const providers = [
  {
    provider: "google" as const,
    label: "Continue with Google",
    icon: GoogleIcon,
    variant: "outline" as const,
    className:
      "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
  },
  {
    provider: "facebook" as const,
    label: "Continue with Facebook",
    icon: FacebookIcon,
    className: "bg-[#1877F2] text-white hover:bg-[#1877F2]/90",
  },
  {
    provider: "apple" as const,
    label: "Continue with Apple",
    icon: AppleIcon,
    className: "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black",
  },
];

export default function InitPage() {
  const handleOAuth = (provider: OAuthProvider) => {
    console.log(provider);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Hero */}
      <div className="relative h-[42vh] w-full overflow-hidden">
        {/* Replace this image with your own generated hero */}
        <Image
          src="/images/login-hero.webp"
          alt="LiveBuddy Hero"
          fill
          priority
          className="object-cover"
        />

        {/* Gradient for smooth transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background" />
      </div>

      {/* Content */}
      <div className="-mt-8 flex flex-1 flex-col rounded-t-[32px] bg-background px-6 pt-8 pb-10">
        <div className="mb-8 text-center">
          <Image
            src="/images/logo.webp"
            alt={env.NEXT_PUBLIC_APP_NAME}
            width={64}
            height={64}
            priority
            className="mx-auto mb-4"
          />

          <h1 className="text-3xl font-bold tracking-tight">
            {env.NEXT_PUBLIC_APP_NAME}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Stay close. Meet nearby. Chat instantly.
          </p>
        </div>

        <div className="space-y-3">
          {providers.map(({ provider, label, icon: Icon, variant, className }) => (
            <Button
              key={provider}
              variant={variant}
              className={`h-12 w-full rounded-xl gap-3 ${className}`}
              onClick={() => handleOAuth(provider)}
            >
              <Icon />
              {label}
            </Button>
          ))}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>

            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs uppercase text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <Link href="/login">
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl gap-3"
            >
              <LogIn className="size-5" />
              Log in with email
            </Button>
          </Link>

          <Link href="/walk-in">
            <Button
              variant="secondary"
              className="h-12 w-full rounded-xl gap-3"
            >
              <User className="size-5" />
              Continue as guest
            </Button>
          </Link>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}