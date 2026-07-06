"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";
import { useAuth } from "@/providers/auth-provider";

export const HomePage = () => {
  const { user } = useAuth();
  const appState = useAppSelector((state) => state.app);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">FriendHereFE</h1>
        <p className="mt-2 text-lg text-zinc-500">Real-time chat and location tracking</p>
        {user && (
          <p className="mt-1 text-sm text-zinc-400">
            Welcome back, {user.name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl w-full">
        <Card className="hover:border-blue-500 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Chat</CardTitle>
            <CardDescription>Real-time messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/chat"}>
              Open Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-green-500 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Location</CardTitle>
            <CardDescription>Live location tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/location"}>
              Open Location
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-500 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg">Users</CardTitle>
            <CardDescription>User management</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/users"}>
              View Users
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-zinc-400">
        Theme: {appState.locale} | Status: Connected
      </p>
    </div>
  );
};
