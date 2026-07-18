"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { forgotPassword } from "@/services/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Gửi yêu cầu thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

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
            Quên mật khẩu
          </h1>

          <p className="mt-3 text-muted-foreground">
            Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
        </div>

        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <CheckCircle className="mb-4 size-16 text-emerald-500" />

            <h2 className="text-xl font-semibold">Đã gửi email</h2>

            <p className="mt-2 text-muted-foreground">
              Kiểm tra hộp thư của bạn để nhận link đặt lại mật khẩu.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Email</Label>

                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="h-12 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                {isLoading ? "Đang gửi..." : "Gửi link đặt lại"}
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Nhớ mật khẩu?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Đăng nhập
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
