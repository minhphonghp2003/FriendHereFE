"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="max-w-md text-sm text-zinc-500">The page you are looking for does not exist.</p>
      <Link href="/" className={buttonVariants()}>Go home</Link>
    </div>
  );
}
