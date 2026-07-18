"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";

const tabs = [
  { href: "/home", label: "Trang chủ", icon: Home },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
