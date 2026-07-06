"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { USER_ID_KEY } from "@/constants";

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
    <div className="flex min-h-dvh items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />
    </div>
  );
}
