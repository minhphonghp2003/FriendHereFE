"use client";

import { useState, useRef, useEffect } from "react";
import { ImagePlus, Video, X, Loader2, MapPin } from "lucide-react";
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
import { useCreateMoment } from "@/hooks/moments";
import { getMyFriendships } from "@/services/friendship";
import { isAccepted } from "@/types/friendship";
import type { MomentVisibility } from "@/types/moment";
import type { FriendshipDto } from "@/types/friendship";

interface CreateMomentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type MediaType = "images" | "video";

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

export const CreateMomentDialog = ({ open, onOpenChange, onCreated }: CreateMomentDialogProps) => {
  const { user } = useAuth();
  const { mutate: createMoment, isLoading } = useCreateMoment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<MomentVisibility>("Friends");
  const [allowComment, setAllowComment] = useState(true);
  const [isShowLocation, setIsShowLocation] = useState(true);
  const [mediaType, setMediaType] = useState<MediaType>("images");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getMyFriendships().then((data) => {
      setFriends(data.filter(isAccepted));
    });
  }, [open]);

  const toggleExcluded = (friendUserId: number) => {
    setExcludedIds((prev) =>
      prev.includes(friendUserId) ? prev.filter((id) => id !== friendUserId) : [...prev, friendUserId]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (mediaType === "images" && images.length === 0) {
      setError("Vui lòng chọn ít nhất một hình ảnh.");
      return;
    }
    if (mediaType === "video" && !video) {
      setError("Vui lòng chọn một video.");
      return;
    }
    try {
      await createMoment({
        caption: caption || undefined,
        visibility,
        allowComment,
        isShowLocation,
        excludedUserIds: excludedIds.length > 0 ? excludedIds.join(",") : undefined,
        images: mediaType === "images" ? images : undefined,
        video: mediaType === "video" ? (video ?? undefined) : undefined,
      });
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo khoảnh khắc thất bại");
    }
  };

  const resetForm = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setCaption("");
    setVisibility("Friends");
    setAllowComment(true);
    setIsShowLocation(true);
    setMediaType("images");
    setImages([]);
    setPreviews([]);
    setVideo(null);
    setVideoPreview(null);
    setExcludedIds([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo khoảnh khắc</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="moment-caption">Chú thích</Label>
            <Input
              id="moment-caption"
              placeholder="Bạn đang nghĩ gì?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="moment-visibility">Ai có thể xem</Label>
            <select
              id="moment-visibility"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as MomentVisibility)}
            >
              <option value="OnlyMe">Chỉ tôi</option>
              <option value="Friends">Bạn bè</option>
              <option value="Lover">Người yêu</option>
              <option value="Public">Công khai</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="moment-allow-comment"
              checked={allowComment}
              onChange={(e) => setAllowComment(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="moment-allow-comment">Cho phép bình luận</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="moment-show-location"
              checked={isShowLocation}
              onChange={(e) => setIsShowLocation(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="moment-show-location" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Hiển thị vị trí
            </Label>
          </div>

          {friends.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Loại trừ bạn bè</Label>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {friends.map((f) => {
                  const friendUserId = user?.id === f.user1Id ? f.user2Id : f.user1Id;
                  const isSelected = excludedIds.includes(friendUserId);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleExcluded(friendUserId)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors ${
                        isSelected
                          ? "border-destructive bg-destructive/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
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
                      <span className="max-w-12 truncate text-[10px] text-muted-foreground">
                        {getNameDisplay(f.otherUserName)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMediaType("images"); removeVideo(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                mediaType === "images" ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              <ImagePlus className="h-4 w-4" />
              Hình ảnh
            </button>
            <button
              type="button"
              onClick={() => { setMediaType("video"); setImages([]); setPreviews([]); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm ${
                mediaType === "video" ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              <Video className="h-4 w-4" />
              Video
            </button>
          </div>

          {mediaType === "images" && (
            <div className="flex flex-col gap-2">
              <Label>Hình ảnh</Label>
              <div className="flex flex-wrap gap-2">
                {previews.map((preview, i) => (
                  <div key={i} className="relative h-20 w-20">
                    <img src={preview} alt="" className="h-full w-full rounded-md object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary"
                  >
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          )}

          {mediaType === "video" && (
            <div className="flex flex-col gap-2">
              <Label>Video</Label>
              {videoPreview ? (
                <div className="relative">
                  <video
                    src={videoPreview}
                    controls
                    className="max-h-60 w-full rounded-md"
                  />
                  <button
                    onClick={removeVideo}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex h-40 items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Video className="h-8 w-8" />
                    <span className="text-xs">Chọn video</span>
                  </div>
                </button>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isLoading ? "Đang tạo..." : "Đăng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
