"use client";
import { useRef, useState } from "react";
import type { AxiosError } from "axios";
import { useAppDispatch } from "@/store/hooks";
import { updateConversationState } from "@/store/slices/chat-slice";
import { useRenameGroupChat, useUpdateGroupImage } from "@/hooks/chat";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import type { ConversationDto } from "@/types/chat";
import { handleApiError } from "@/lib/axios";

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDto | null;
  onNameChanged?: (name: string) => void;
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  conversation,
  onNameChanged,
}: GroupSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const { mutate: renameGroup, isLoading: renaming } = useRenameGroupChat();
  const { mutate: updateImage, isLoading: uploading } = useUpdateGroupImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const conversationId = conversation?.id ?? 0;
  const name = editedName ?? conversation?.name ?? "";

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditedName(null);
      setNameError(null);
    }
    onOpenChange(next);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !conversationId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    try {
      const updated = await updateImage(conversationId, file);
      dispatch(updateConversationState({ conversationId, patch: { image: updated.image ?? null } }));
      toast.success("Đã đổi ảnh nhóm");
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể đổi ảnh nhóm");
    }
  };

  const handleSaveName = async () => {
    if (!conversationId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Tên nhóm không được để trống");
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Tên nhóm tối đa 100 ký tự");
      return;
    }
    setNameError(null);
    try {
      await renameGroup(conversationId, trimmed);
      dispatch(updateConversationState({ conversationId, patch: { name: trimmed } }));
      setEditedName(null);
      onNameChanged?.(trimmed);
      toast.success("Đã đổi tên nhóm");
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể đổi tên nhóm");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thiết lập nhóm</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
              {conversation?.image?.thumbUrl ? (
                <img src={conversation.image.thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Users className="h-8 w-8 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Đang tải lên..." : "Đổi ảnh nhóm"}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="group-settings-name" className="text-sm font-medium text-muted-foreground">
              Tên nhóm
            </label>
            <input
              id="group-settings-name"
              value={name}
              onChange={(e) => {
                setEditedName(e.target.value);
                setNameError(null);
              }}
              maxLength={100}
              placeholder="Nhập tên nhóm"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={renaming || !name.trim()} onClick={handleSaveName}>
            {renaming && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu tên nhóm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}