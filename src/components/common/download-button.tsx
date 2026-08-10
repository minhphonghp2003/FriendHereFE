"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { downloadFromUrl } from "@/lib/download";

interface DownloadButtonProps {
  url: string;
  fileName?: string;
  className?: string;
  label?: string;
}

export const DownloadButton = ({
  url,
  fileName,
  className = "",
  label = "Tải xuống",
}: DownloadButtonProps) => {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDownload = async () => {
    if (state !== "idle") return;
    setState("loading");
    const ok = await downloadFromUrl(url, fileName);
    if (ok) {
      setState("done");
      toast.success("Đã tải xuống");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState("idle"), 2000);
    } else {
      setState("idle");
      toast.error("Không thể tải xuống, đã mở trong tab mới");
    }
  };

  return (
    <button
      onClick={handleDownload}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 ${className}`}
    >
      {state === "loading" ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-5 w-5 text-emerald-400" />
      ) : (
        <Download className="h-5 w-5" />
      )}
    </button>
  );
};
