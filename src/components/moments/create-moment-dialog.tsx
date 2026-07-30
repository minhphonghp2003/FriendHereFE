"use client";

import { useState, useRef } from "react";
import { ImagePlus, Video, X, Loader2 } from "lucide-react";
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
import { useCreateMoment } from "@/hooks/moments";
import type { MomentVisibility } from "@/types/moment";

interface CreateMomentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type MediaType = "images" | "video";

export const CreateMomentDialog = ({ open, onOpenChange, onCreated }: CreateMomentDialogProps) => {
  const { mutate: createMoment, isLoading } = useCreateMoment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<MomentVisibility>("Friends");
  const [allowComment, setAllowComment] = useState(true);
  const [mediaType, setMediaType] = useState<MediaType>("images");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setMediaType("images");
    setImages([]);
    setPreviews([]);
    setVideo(null);
    setVideoPreview(null);
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
