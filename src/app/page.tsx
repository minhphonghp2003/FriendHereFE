"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { USER_ID_KEY } from "@/constants";
import { LoadingVideo } from "@/components/common/loading-video";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (userId) {
      router.replace("/home");
    } else {
      router.replace("/init");
    }
  }, [router]);

  return (
    <div className="safe-top safe-bottom flex min-h-dvh items-center justify-center">
      <LoadingVideo size="lg" />
    </div>
  );
}
