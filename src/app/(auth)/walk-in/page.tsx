"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/providers/auth-provider";
import { createWalkIn } from "@/services/auth";

export default function WalkInPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    genderId: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const result = await createWalkIn({
        name: form.name,
        age: Number(form.age),
        genderId: Number(form.genderId),
      });

      login({
        id: result.id,
        name: result.name,
        email: result.email ?? "",
        isWalkIn: true,
      });

      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tài khoản khách");
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
          Back
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Dùng thử với tư cách khách
          </h1>

          <p className="mt-3 text-muted-foreground">
            Trải nghiệm ngay lập tức. Bạn có thể tạo tài khoản sau.
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
                placeholder="Mọi người nên gọi bạn là gì?"
                className="h-12 rounded-xl"
                value={form.name}
                onChange={(e) =>
                  setForm((x) => ({
                    ...x,
                    name: e.target.value,
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
                  min={1}
                  max={120}
                  value={form.age}
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

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              Tài khoản khách chỉ là tạm thời. Tạo tài khoản vĩnh viễn sau để
              lưu hồ sơ, bạn bè và lịch sử trò chuyện.
            </div>
          </div>

          <div className="mt-auto pt-8">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl text-base"
            >
              {isLoading ? "Đang vào..." : "Tiếp tục với tư cách khách"}
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Muốn giữ tài khoản?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Tạo tài khoản ngay
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}