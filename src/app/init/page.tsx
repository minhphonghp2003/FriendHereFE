"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LogIn, UserPlus } from "lucide-react";

export default function InitPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">FriendHere</h1>
        <p className="mt-2 text-sm text-zinc-500">Real-time chat and location tracking</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link href="/walk-in" className="w-full">
          <Card className="cursor-pointer transition-colors hover:border-blue-500">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <User className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-base">Continue as Guest</CardTitle>
                <CardDescription>No account needed</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/login" className="w-full">
          <Card className="cursor-pointer transition-colors hover:border-green-500">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <LogIn className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle className="text-base">Login</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/register" className="w-full">
          <Card className="cursor-pointer transition-colors hover:border-purple-500">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <UserPlus className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle className="text-base">Register</CardTitle>
                <CardDescription>Create a new account</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
