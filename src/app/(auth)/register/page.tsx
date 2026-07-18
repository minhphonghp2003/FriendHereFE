"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/providers/auth-provider";
import { register as apiRegister } from "@/services/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    genderId: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiRegister({
        name: form.name,
        email: form.email,
        password: form.password,
        age: Number(form.age),
        genderId: Number(form.genderId),
      });

      login(
        {
          id: result.userId,
          name: result.name,
          email: result.email,
          isWalkIn: false,
        },
        result.token,
      );

      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
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

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Tạo tài khoản
          </h1>

          <p className="mt-3 text-muted-foreground">
            Tham gia LiveBuddy và bắt đầu khám phá bạn bè xung quanh bạn.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tên</Label>

              <Input
                placeholder="Tên của bạn"
                className="h-12 rounded-xl"
                value={form.name}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    name: e.target.value,
                  }))
                }
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>

              <Input
                type="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl"
                value={form.email}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    email: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tuổi</Label>

                <Input
                  type="number"
                  placeholder="18"
                  className="h-12 rounded-xl"
                  value={form.age}
                  min={1}
                  max={120}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      age: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Giới tính</Label>

                <select
                  className="flex h-12 w-full items-center rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.genderId}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      genderId: e.target.value,
                    }))
                  }
                >
                  <option value="1">Nam</option>
                  <option value="2">Nữ</option>
                  <option value="3">Gay</option>
                  <option value="4">Les</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mật khẩu</Label>

              <Input
                type="password"
                placeholder="Ít nhất 8 ký tự"
                className="h-12 rounded-xl"
                value={form.password}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    password: e.target.value,
                  }))
                }
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
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    confirmPassword: e.target.value,
                  }))
                }
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

          <div className="mt-auto pt-8">
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base"
              disabled={isLoading}
            >
              {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}