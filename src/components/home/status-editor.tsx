"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Check } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMyStatus } from "@/store/slices/location-slice";
import { locationHub } from "@/lib/signalr";

const STATUS_MAX_LENGTH = 50;

export const StatusEditor = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.location.status);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(status ?? "");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleToggle = useCallback(() => {
    if (!open) setValue(status ?? "");
    setOpen((o) => !o);
  }, [open, status]);

  const handleSave = useCallback(async () => {
    const text = value.trim().slice(0, STATUS_MAX_LENGTH);
    setSaving(true);
    try {
      await locationHub.updateStatus(text);
      dispatch(setMyStatus(text || null));
      setOpen(false);
    } catch (err) {
      console.error("[StatusEditor] UpdateStatus error:", err);
    } finally {
      setSaving(false);
    }
  }, [value, dispatch]);

  const handleClear = useCallback(async () => {
    setSaving(true);
    try {
      await locationHub.updateStatus("");
      dispatch(setMyStatus(null));
      setOpen(false);
    } catch (err) {
      console.error("[StatusEditor] Clear status error:", err);
    } finally {
      setSaving(false);
    }
  }, [dispatch]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="border-border bg-card text-foreground hover:bg-muted flex max-w-[180px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-md transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{status ? status : "Đặt trạng thái"}</span>
      </button>
      {open && (
        <div className="border-border bg-card absolute right-0 z-40 mt-1 w-64 rounded-xl border p-3 shadow-lg">
          <input
            autoFocus
            value={value}
            maxLength={STATUS_MAX_LENGTH}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="VD: Đang đi làm, Đừng làm phiền"
            className="border-border text-foreground focus:border-primary focus:ring-primary w-full rounded-lg border px-3 py-2 text-xs outline-none focus:ring-1"
          />
          <div className="text-muted-foreground mt-1 text-right text-[10px]">
            {value.length}/{STATUS_MAX_LENGTH}
          </div>
          <div className="mt-1 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              Lưu
            </button>
            {status && (
              <button
                onClick={handleClear}
                disabled={saving}
                className="bg-muted text-foreground hover:bg-muted/80 flex-1 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
