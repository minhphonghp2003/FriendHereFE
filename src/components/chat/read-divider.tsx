"use client";

const formatLastReadAt = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  const datePart = date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  const sameYear = date.getFullYear() === now.getFullYear();
  return `${datePart}${sameYear ? "" : `/${date.getFullYear()}`} ${time}`;
};

interface ReadDividerProps {
  lastReadAt: string | null;
}

export const ReadDivider = ({ lastReadAt }: ReadDividerProps) => {
  return (
    <div className="flex items-center gap-3 py-1" role="separator" aria-label="Đã đọc đến đây">
      <div className="bg-border h-px flex-1" />
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        Đã đọc đến đây · {formatLastReadAt(lastReadAt)}
      </p>
      <div className="bg-border h-px flex-1" />
    </div>
  );
};
