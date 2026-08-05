"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Check, CalendarDays, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/auth-provider";
import { useAvailableMoments, useCreateTimeline } from "@/hooks/timelines";
import { getMyFriendships } from "@/services/friendship";
import { isAccepted } from "@/types/friendship";
import type { MomentDto } from "@/types/moment";
import type { FriendshipDto } from "@/types/friendship";
import { getMomentThumbnail } from "@/services/moment";

interface CreateTimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const toRangeStart = (date: string) => `${date}T00:00:00Z`;
const toRangeEnd = (date: string) => `${date}T23:59:59Z`;

const todayIso = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

export const CreateTimelineDialog = ({
  open,
  onOpenChange,
  onCreated,
}: CreateTimelineDialogProps) => {
  const { user } = useAuth();
  const { mutate: createTimeline, isLoading: creating } = useCreateTimeline();
  const [caption, setCaption] = useState("");
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [partnerIds, setPartnerIds] = useState<number[]>([]);
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    data: moments,
    isLoading,
    isLoadingMore,
    error: loadError,
    hasMore,
    hasRange,
    loadMore,
  } = useAvailableMoments(
    open && hasValidRange(fromDate, toDate) ? toRangeStart(fromDate) : null,
    open && hasValidRange(fromDate, toDate) ? toRangeEnd(toDate) : null,
  );

  useEffect(() => {
    if (!open) return;
    getMyFriendships({ take: 100 })
      .then((res) => setFriends(res.data.filter(isAccepted)))
      .catch(() => {});
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCaption("");
      setSelectedIds([]);
      setPartnerIds([]);
      setError(null);
    }
    onOpenChange(next);
  };

  const selectedMoments = useMemo(() => {
    const map = new Map(moments.map((m) => [m.id, m]));
    return selectedIds.map((id) => map.get(id)).filter((m): m is MomentDto => !!m);
  }, [moments, selectedIds]);

  const toggleMoment = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const togglePartner = (id: number) => {
    setPartnerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError("Vui lòng chọn ít nhất một khoảnh khắc.");
      return;
    }
    setError(null);
    try {
      await createTimeline({ caption: caption.trim(), partnerIds, momentIds: selectedIds });
      setCaption("");
      setSelectedIds([]);
      setPartnerIds([]);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo dòng thời gian thất bại");
    }
  };

  const toggleAllSelected = () => {
    if (selectedIds.length === moments.length && moments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(moments.map((m) => m.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Tạo dòng thời gian
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="timeline-caption">Tiêu đề</Label>
            <Input
              id="timeline-caption"
              placeholder="VD: Chuyến đi mùa hè"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Khoảng thời gian
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <Input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Chọn khoảnh khắc</Label>
              {moments.length > 0 && (
                <Button type="button" variant="ghost" size="xs" onClick={toggleAllSelected}>
                  {selectedIds.length === moments.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </Button>
              )}
            </div>

            {!hasRange ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Chọn khoảng thời gian
              </p>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : loadError ? (
              <p className="text-destructive py-6 text-center text-sm">Không thể tải khoảnh khắc</p>
            ) : moments.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Không có khoảnh khắc khả dụng trong khoảng thời gian này
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {moments.map((moment) => {
                  const thumb = getMomentThumbnail(moment);
                  const selected = selectedIds.includes(moment.id);
                  return (
                    <button
                      key={moment.id}
                      type="button"
                      onClick={() => toggleMoment(moment.id)}
                      className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                        selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                        {thumb ? (
                          <img src={thumb.thumbUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                            Media
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {moment.caption || "Không có chú thích"}
                        </p>
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                          {moment.location?.isShowed && (
                            <>
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {moment.location.placeName ||
                                  `${moment.location.latitude.toFixed(3)}, ${moment.location.longitude.toFixed(3)}`}
                              </span>
                            </>
                          )}
                          <span className="shrink-0">
                            {new Date(moment.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
                {hasMore && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="mt-1"
                  >
                    {isLoadingMore ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Tải thêm
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Bạn đồng hành</Label>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {friends.length === 0 ? (
                <p className="text-muted-foreground py-2 text-xs">Chưa có bạn bè</p>
              ) : (
                friends.map((f) => {
                  const friendUserId = user?.id === f.user1Id ? f.user2Id : f.user1Id;
                  const isSelected = partnerIds.includes(friendUserId);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => togglePartner(friendUserId)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors ${
                        isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
                        {f.otherUserImage ? (
                          <img
                            src={f.otherUserImage.thumbUrl}
                            alt={f.otherUserName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getNameDisplay(f.otherUserName)
                        )}
                      </div>
                      <span className="text-muted-foreground max-w-12 truncate text-[10px]">
                        {getNameDisplay(f.otherUserName)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {selectedMoments.length > 0 && (
            <p className="text-muted-foreground text-xs">
              Đã chọn {selectedMoments.length} khoảnh khắc
            </p>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={creating || selectedIds.length === 0}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {creating ? "Đang tạo..." : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function hasValidRange(fromDate: string, toDate: string): boolean {
  return !!fromDate && !!toDate && fromDate <= toDate;
}
