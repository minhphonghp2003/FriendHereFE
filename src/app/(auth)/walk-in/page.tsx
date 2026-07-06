"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { createWalkIn } from "@/services/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      login(
        { id: result.id, name: result.name, email: result.email || "", isWalkIn: true },
      );
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create guest");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/init" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Guest Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Your age"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  required
                  min={1}
                  max={150}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                  value={form.genderId}
                  onChange={(e) => setForm({ ...form, genderId: e.target.value })}
                >
                  <option value="1">Male</option>
                  <option value="2">Female</option>
                  <option value="3">Gay</option>
                  <option value="4">Les</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Continue as Guest"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
