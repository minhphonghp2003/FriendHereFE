"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { USER_ID_KEY, V2_LAST_PAGE_KEY } from "@/constants";
import { LoadingVideo } from "@/components/common/loading-video";

export default function V2HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Not logged in → auth entry; otherwise resume the last open page
    const last =
      typeof window !== "undefined" ? window.localStorage.getItem(V2_LAST_PAGE_KEY) : null;
    const userId =
      typeof window !== "undefined" ? window.localStorage.getItem(USER_ID_KEY) : null;
    if (!userId) {
      router.replace("/init");
      return;
    }
    router.replace(last === "moments" ? "/moments" : "/location");
  }, [router]);

  return (
    <div className="safe-top safe-bottom flex h-dvh items-center justify-center">
      <LoadingVideo size="lg" />
    </div>
  );
}
