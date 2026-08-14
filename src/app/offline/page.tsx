"use client";

import Link from "next/link";
import { WifiOff, RotateCcw } from "lucide-react";
import { env } from "@/config/env";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <WifiOff className="size-10 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">You&apos;re offline</h1>
          <p className="text-sm text-muted-foreground">
            You can still browse cached conversations, moments, and timelines.
            Actions you take will be queued and synced automatically when
            you&apos;re back online.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            className="h-11 w-full rounded-xl"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="mr-2 size-4" />
            Try again
          </Button>

          <Link href="/home" className="block">
            <Button variant="outline" className="h-11 w-full rounded-xl">
              Go to {env.NEXT_PUBLIC_APP_NAME}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
