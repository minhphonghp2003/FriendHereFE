"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, MessageCircle, Image, Route } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

const tabs = [
  { href: "/legacy/home", label: "Trang chủ", icon: Home },
  { href: "/legacy/moments", label: "Khoảnh khắc", icon: Image },
  { href: "/legacy/timelines", label: "Hành trình", icon: Route },
  { href: "/legacy/chat", label: "Tin nhắn", icon: MessageCircle },
  { href: "/legacy/settings", label: "Cài đặt", icon: Settings },
];

export const BottomNav = () => {
  const pathname = usePathname();
  const totalUnread = useAppSelector((s) =>
    s.chat.conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
  );

  return (
    <nav
      className="border-border bg-background fixed right-0 bottom-0 left-0 z-50 border-t"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
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
              <span className="relative">
                <tab.icon className="h-6 w-6" />
                {tab.href === "/legacy/chat" && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[1.05rem] rounded-full bg-red-500 px-1 text-center text-[10px] leading-[1.05rem] font-bold text-white">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </span>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
