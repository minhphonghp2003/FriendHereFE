"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { USER_ID_KEY } from "@/constants";
import { BottomNav } from "@/components/mobile/bottom-nav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      router.replace("/init");
    } else {
      setAllowed(true);
    }
  }, [router]);

  if (!allowed) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
