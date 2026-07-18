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
      setError("Passwords do not match");
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
      setError(err instanceof Error ? err.message : "Registration failed");
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
            Create account
          </h1>

          <p className="mt-3 text-muted-foreground">
            Join LiveBuddy and start discovering friends around you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Name</Label>

              <Input
                placeholder="Your name"
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
                <Label>Age</Label>

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
                <Label>Gender</Label>

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
                  <option value="1">Male</option>
                  <option value="2">Female</option>
                  <option value="3">Gay</option>
                  <option value="4">Lesbian</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Password</Label>

              <Input
                type="password"
                placeholder="At least 8 characters"
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
              <Label>Confirm password</Label>

              <Input
                type="password"
                placeholder="Re-enter your password"
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
              {isLoading ? "Creating account..." : "Create account"}
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}