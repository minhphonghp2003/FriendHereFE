"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/providers/auth-provider";
import { login as apiLogin } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiLogin(form);

      login(
        {
          id: result.userId,
          name: result.name,
          email: result.email,
        },
        result.token,
      );

      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
        <Link
          href="/init"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">
            Chào mừng trở lại
          </h1>

          <p className="mt-3 text-muted-foreground">
            Đăng nhập để tiếp tục trò chuyện và xem bạn bè ở đâu.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    email: e.target.value,
                  }))
                }
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mật khẩu</Label>

                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Quên?
                </Link>
              </div>

              <Input
                type="password"
                placeholder="Mật khẩu"
                value={form.password}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    password: e.target.value,
                  }))
                }
                className="h-12 rounded-xl"
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
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Tạo tài khoản
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}