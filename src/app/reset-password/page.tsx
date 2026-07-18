"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { resetPassword } from "@/services/auth";
import { handleApiError } from "@/lib/axios";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    router.replace("/forgot-password?error=invalid_link");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(handleApiError(err as any).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-dvh flex-col bg-background">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <CheckCircle className="mb-4 size-16 text-emerald-500" />

          <h2 className="text-xl font-semibold">Đặt lại mật khẩu thành công</h2>

          <p className="mt-2 text-muted-foreground">
            Đang chuyển hướng đến trang đăng nhập...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
        <Link
          href="/login"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Quay lại đăng nhập
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            Đặt lại mật khẩu
          </h1>

          <p className="mt-3 text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Mật khẩu mới</Label>

              <Input
                type="password"
                placeholder="Ít nhất 8 ký tự"
                className="h-12 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label>Xác nhận mật khẩu</Label>

              <Input
                type="password"
                placeholder="Nhập lại mật khẩu"
                className="h-12 rounded-xl"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="mt-auto pt-10">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl text-base"
            >
              {isLoading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-semibold text-primary hover:underline"
          >
            Yêu cầu link mới
          </Link>
        </p>
      </div>
    </main>
  );
}
