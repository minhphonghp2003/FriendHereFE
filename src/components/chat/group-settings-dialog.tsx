"use client";
import { useRef, useState } from "react";
import type { AxiosError } from "axios";
import { useAppDispatch } from "@/store/hooks";
import { updateConversationState } from "@/store/slices/chat-slice";
import { useRenameGroupChat, useUpdateGroupImage, useConversationMembers } from "@/hooks/chat";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import type { ConversationDto } from "@/types/chat";
import { ConversationMemberRole } from "@/types/chat";
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
  const {
    members,
    isLoading: loadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useConversationMembers(conversation?.id ?? 0);
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Thành viên ({members.length})</p>
              <button
                type="button"
                onClick={refetchMembers}
                disabled={loadingMembers}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Tải lại danh sách thành viên"
              >
                <RefreshCw className={`h-4 w-4 ${loadingMembers ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {loadingMembers && members.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : membersError ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <p>{membersError.message}</p>
                  <Button type="button" variant="outline" size="sm" onClick={refetchMembers}>
                    Thử lại
                  </Button>
                </div>
              ) : members.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Không có thành viên nào</p>
              ) : (
                members.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="relative shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                        {member.userImage?.thumbUrl ? (
                          <img src={member.userImage.thumbUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          member.userName?.charAt(0)?.toUpperCase() ?? "?"
                        )}
                      </div>
                      {member.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-medium">
                        <span className="truncate">{member.userName}</span>
                        {member.role === ConversationMemberRole.Host && (
                          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.role === ConversationMemberRole.Host ? "Chủ nhóm" : member.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
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