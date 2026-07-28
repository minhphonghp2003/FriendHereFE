"use client";

import { useState, useRef } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
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

export const CreateMomentDialog = ({ open, onOpenChange, onCreated }: CreateMomentDialogProps) => {
  const { mutate: createMoment, isLoading } = useCreateMoment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<MomentVisibility>("Friends");
  const [allowComment, setAllowComment] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
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

  const handleSubmit = async () => {
    setError(null);
    try {
      await createMoment({
        caption: caption || undefined,
        visibility,
        allowComment,
        images: images.length > 0 ? images : undefined,
      });
      setCaption("");
      setVisibility("Friends");
      setAllowComment(true);
      setImages([]);
      setPreviews([]);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo khoảnh khắc thất bại");
    }
  };

  const handleClose = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setCaption("");
    setVisibility("Friends");
    setAllowComment(true);
    setImages([]);
    setPreviews([]);
    setError(null);
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary"
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              </button>
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
