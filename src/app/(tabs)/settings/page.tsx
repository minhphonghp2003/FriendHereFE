"use client";

import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, Bell, Shield, HelpCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { mutate: logout, isLoading } = useLogout();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <User className="h-6 w-6 text-zinc-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{user?.name || "Guest"}</CardTitle>
            <p className="text-sm text-zinc-500">{user?.email || "No email"}</p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50">
            <Bell className="h-5 w-5 text-zinc-600" />
            <span className="flex-1">Notifications</span>
            <span className="text-zinc-400">›</span>
          </button>
          <Separator />
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50">
            <Shield className="h-5 w-5 text-zinc-600" />
            <span className="flex-1">Privacy</span>
            <span className="text-zinc-400">›</span>
          </button>
          <Separator />
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50">
            <HelpCircle className="h-5 w-5 text-zinc-600" />
            <span className="flex-1">Help</span>
            <span className="text-zinc-400">›</span>
          </button>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => logout()}
        disabled={isLoading}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isLoading ? "Logging out..." : "Log Out"}
      </Button>
    </div>
  );
}
