"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { V2_LAST_PAGE_KEY } from "@/constants";
import { LoadingVideo } from "@/components/common/loading-video";

export default function V2HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Resume the last open page (home/moments) from the previous session
    const last =
      typeof window !== "undefined" ? window.localStorage.getItem(V2_LAST_PAGE_KEY) : null;
    router.replace(last === "moments" ? "/v2/moments" : "/v2/location");
  }, [router]);

  return (
    <div className="safe-top safe-bottom flex h-dvh items-center justify-center">
      <LoadingVideo size="lg" />
    </div>
  );
}
