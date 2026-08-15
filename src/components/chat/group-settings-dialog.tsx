"use client";
import { useRef, useState } from "react";
import type { AxiosError } from "axios";
import { useAppDispatch } from "@/store/hooks";
import { updateConversationState, removeConversation } from "@/store/slices/chat-slice";
import {
  useRenameGroupChat,
  useUpdateGroupImage,
  useConversationMembers,
  useAddGroupMember,
  useRemoveGroupMember,
  useLeaveGroup,
  usePendingJoinRequests,
  useConfirmJoinRequest,
  useSetGroupRestricted,
} from "@/hooks/chat";
import { deleteChat } from "@/services/chat";
import { getMyFriendships } from "@/services/friendship";
import { isAccepted } from "@/types/friendship";
import type { FriendshipDto } from "@/types/friendship";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Loader2,
  LogOut,
  RefreshCw,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import type { ConversationDto, ConversationMemberDto, JoinRequestDto } from "@/types/chat";
import { ConversationMemberRole } from "@/types/chat";
import { handleApiError } from "@/lib/axios";

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDto | null;
  onNameChanged?: (name: string) => void;
  onExitGroup?: () => void;
}

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

type DialogView = "main" | "add";

export function GroupSettingsDialog({
  open,
  onOpenChange,
  conversation,
  onNameChanged,
  onExitGroup,
}: GroupSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { mutate: renameGroup, isLoading: renaming } = useRenameGroupChat();
  const { mutate: updateImage, isLoading: uploading } = useUpdateGroupImage();
  const {
    members,
    isLoading: loadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useConversationMembers(conversation?.id ?? 0, open);
  const conversationId = conversation?.id ?? 0;
  const currentUserRole = members.find((m) => m.userId === user?.id)?.role;
  const isHost = currentUserRole === ConversationMemberRole.Host;
  const canAddMember = !conversation?.isRestricted || isHost;
  const { mutate: addMember, isLoading: addingMember } = useAddGroupMember();
  const { mutate: removeMember } = useRemoveGroupMember();
  const { mutate: leave, isLoading: leaving } = useLeaveGroup();
  const {
    requests: joinRequests,
    isLoading: loadingJoinRequests,
    error: joinRequestsError,
    refetch: refetchJoinRequests,
  } = usePendingJoinRequests(isHost ? conversationId : 0, open);
  const { mutate: confirmRequest } = useConfirmJoinRequest();
  const { mutate: setRestricted } = useSetGroupRestricted();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [view, setView] = useState<DialogView>("main");
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const name = editedName ?? conversation?.name ?? "";
  const otherUserId = (f: FriendshipDto) => (user?.id === f.user1Id ? f.user2Id : f.user1Id);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditedName(null);
      setNameError(null);
      setView("main");
      setFriends([]);
      setFriendsError(null);
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
      dispatch(
        updateConversationState({ conversationId, patch: { image: updated.image ?? null } }),
      );
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

  const handleOpenAdd = async () => {
    setView("add");
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const res = await getMyFriendships({ take: 100 });
      const memberIds = new Set(members.map((m) => m.userId));
      setFriends(res.data.filter((f) => isAccepted(f) && !memberIds.has(otherUserId(f))));
    } catch {
      setFriendsError("Không thể tải danh sách bạn bè");
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleAdd = async (friend: FriendshipDto) => {
    if (!conversationId) return;
    const targetUserId = otherUserId(friend);
    try {
      await addMember(conversationId, targetUserId);
      setFriends((prev) => prev.filter((f) => f.id !== friend.id));
      refetchMembers();
      toast.success(`Đã thêm ${friend.otherUserName} vào nhóm`);
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể thêm thành viên");
    }
  };

  const handleRemove = async (member: ConversationMemberDto) => {
    if (!conversationId) return;
    if (!window.confirm(`Xóa ${member.userName} khỏi nhóm? Họ sẽ ngừng nhận tin nhắn từ nhóm.`))
      return;
    setRemovingUserId(member.userId);
    try {
      await removeMember(conversationId, member.userId);
      refetchMembers();
      toast.success(`Đã xóa ${member.userName} khỏi nhóm`);
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể xóa thành viên");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleLeave = async () => {
    if (!conversationId) return;
    if (!window.confirm("Rời khỏi nhóm này? Bạn sẽ không nhận được tin nhắn từ nhóm nữa.")) return;
    try {
      await leave(conversationId);
      dispatch(removeConversation(conversationId));
      onOpenChange(false);
      onExitGroup?.();
      toast.success("Đã rời khỏi nhóm");
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể rời khỏi nhóm");
    }
  };

  const handleDeleteGroup = async () => {
    if (!conversationId) return;
    if (
      !window.confirm(
        "Xóa nhóm này? Cuộc trò chuyện, thành viên và tin nhắn sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.",
      )
    )
      return;
    try {
      await deleteChat(conversationId);
      dispatch(removeConversation(conversationId));
      onOpenChange(false);
      onExitGroup?.();
      toast.success("Đã xóa nhóm");
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể xóa nhóm");
    }
  };

  const handleConfirmJoinRequest = async (req: JoinRequestDto, isApproved: boolean) => {
    setProcessingRequestId(req.id);
    try {
      await confirmRequest(req.id, isApproved);
      refetchJoinRequests();
      if (isApproved) refetchMembers();
      toast.success(
        isApproved ? `Đã duyệt ${req.userName} vào nhóm` : `Đã từ chối yêu cầu của ${req.userName}`,
      );
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể xử lý yêu cầu tham gia");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleToggleRestricted = async () => {
    if (!conversationId) return;
    const next = !conversation?.isRestricted;
    dispatch(updateConversationState({ conversationId, patch: { isRestricted: next } }));
    try {
      await setRestricted(conversationId, next);
      toast.success(next ? "Đã bật nhóm riêng tư" : "Đã tắt nhóm riêng tư");
    } catch (err) {
      dispatch(updateConversationState({ conversationId, patch: { isRestricted: !next } }));
      toast.error(handleApiError(err as AxiosError).message || "Không thể cập nhật cài đặt nhóm");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{view === "add" ? "Thêm thành viên" : "Thiết lập nhóm"}</DialogTitle>
        </DialogHeader>

        {view === "add" ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">Chọn bạn bè để thêm vào nhóm</p>
            <div className="border-border max-h-72 overflow-y-auto rounded-lg border">
              {friendsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              ) : friendsError ? (
                <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
                  <p>{friendsError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleOpenAdd}>
                    Thử lại
                  </Button>
                </div>
              ) : friends.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Không còn bạn bè nào để thêm
                </p>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
                      {friend.otherUserImage?.thumbUrl ? (
                        <img
                          src={friend.otherUserImage.thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getNameDisplay(friend.otherUserName ?? "")
                      )}
                    </div>
                    <p className="flex-1 truncate text-sm font-medium">{friend.otherUserName}</p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={addingMember}
                      onClick={() => handleAdd(friend)}
                    >
                      {addingMember ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="h-3.5 w-3.5" />
                      )}
                      Thêm
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2">
              <div className="bg-muted relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full">
                {conversation?.image?.thumbUrl ? (
                  <img
                    src={conversation.image.thumbUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Users className="text-muted-foreground h-8 w-8" />
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Đang tải lên..." : "Đổi ảnh nhóm"}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="group-settings-name"
                className="text-muted-foreground text-sm font-medium"
              >
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
                className="border-border bg-background focus:border-ring rounded-lg border px-3 py-2 text-sm outline-none"
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            </div>

            {isHost && (
              <div className="border-border flex items-center justify-between rounded-lg border px-3 py-3">
                <div>
                  <p className="text-sm font-medium">Nhóm riêng tư</p>
                  <p className="text-muted-foreground text-xs">
                    {conversation?.isRestricted
                      ? "Chủ nhóm duyệt yêu cầu tham gia"
                      : "Ai cũng có thể tham gia"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRestricted}
                  className={`relative h-6 w-11 rounded-full transition-colors ${conversation?.isRestricted ? "bg-blue-600" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${conversation?.isRestricted ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm font-medium">
                  Thành viên ({members.length})
                </p>
                <button
                  type="button"
                  onClick={refetchMembers}
                  disabled={loadingMembers}
                  className="text-muted-foreground hover:bg-muted rounded-full p-1 disabled:opacity-50"
                  aria-label="Tải lại danh sách thành viên"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMembers ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="border-border max-h-64 overflow-y-auto rounded-lg border">
                {loadingMembers && members.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                  </div>
                ) : membersError ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
                    <p>{membersError.message}</p>
                    <Button type="button" variant="outline" size="sm" onClick={refetchMembers}>
                      Thử lại
                    </Button>
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    Không có thành viên nào
                  </p>
                ) : (
                  members.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="relative shrink-0">
                        <div className="bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
                          {member.userImage?.thumbUrl ? (
                            <img
                              src={member.userImage.thumbUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (member.userName?.charAt(0)?.toUpperCase() ?? "?")
                          )}
                        </div>
                        {member.isOnline && (
                          <span className="ring-background absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-sm font-medium">
                          <span className="truncate">{member.userName}</span>
                          {member.role === ConversationMemberRole.Host && (
                            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {member.role === ConversationMemberRole.Host
                            ? "Chủ nhóm"
                            : member.isOnline
                              ? "Đang hoạt động"
                              : "Ngoại tuyến"}
                        </p>
                      </div>
                      {isHost && member.role === ConversationMemberRole.Member && (
                        <button
                          onClick={() => handleRemove(member)}
                          disabled={removingUserId === member.userId}
                          className="text-muted-foreground shrink-0 rounded-full p-1.5 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                          aria-label={`Xóa ${member.userName} khỏi nhóm`}
                        >
                          {removingUserId === member.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              {!loadingMembers && canAddMember && (
                <Button type="button" variant="outline" className="w-full" onClick={handleOpenAdd}>
                  <UserPlus className="h-4 w-4" />
                  Thêm thành viên
                </Button>
              )}
            </div>

            {isHost && conversation?.isRestricted && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm font-medium">
                    Yêu cầu tham gia ({joinRequests.length})
                  </p>
                  <button
                    type="button"
                    onClick={refetchJoinRequests}
                    disabled={loadingJoinRequests}
                    className="text-muted-foreground hover:bg-muted rounded-full p-1 disabled:opacity-50"
                    aria-label="Tải lại yêu cầu tham gia"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingJoinRequests ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <div className="border-border max-h-48 overflow-y-auto rounded-lg border">
                  {loadingJoinRequests && joinRequests.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                    </div>
                  ) : joinRequestsError ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
                      <p>{joinRequestsError.message}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={refetchJoinRequests}
                      >
                        Thử lại
                      </Button>
                    </div>
                  ) : joinRequests.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      Không có yêu cầu nào
                    </p>
                  ) : (
                    joinRequests.map((req) => {
                      const processing = processingRequestId === req.id;
                      return (
                        <div key={req.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
                            {req.userImage?.thumbUrl ? (
                              <img
                                src={req.userImage.thumbUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (req.userName?.charAt(0)?.toUpperCase() ?? "?")
                            )}
                          </div>
                          <p className="flex-1 truncate text-sm font-medium">{req.userName}</p>
                          <div className="flex shrink-0 gap-1.5">
                            <Button
                              size="sm"
                              disabled={processing}
                              onClick={() => handleConfirmJoinRequest(req, true)}
                            >
                              {processing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processing}
                              onClick={() => handleConfirmJoinRequest(req, false)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Từ chối
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {!loadingMembers && !membersError && members.length > 0 && (
              <div className="flex flex-col gap-2">
                {isHost ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-red-600 hover:bg-red-500/10"
                    onClick={handleDeleteGroup}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa nhóm
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-red-600 hover:bg-red-500/10"
                    disabled={leaving}
                    onClick={handleLeave}
                  >
                    {leaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Rời khỏi nhóm
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {view === "add" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setView("main")}
            >
              Quay lại
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Hủy
              </Button>
              <Button type="button" disabled={renaming || !name.trim()} onClick={handleSaveName}>
                {renaming && <Loader2 className="h-4 w-4 animate-spin" />}
                Lưu tên nhóm
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
