"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { useCreateGroupChat } from "@/hooks/chat";
import { getMyFriendships } from "@/services/friendship";
import { createGroupChatSchema } from "@/validators/chat";
import { isAccepted } from "@/types/friendship";
import { ArrowLeft, Check, Loader2, UserPlus } from "lucide-react";
import type { FriendshipDto } from "@/types/friendship";

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

export default function NewGroupChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { mutate: createGroup, isLoading } = useCreateGroupChat();
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyFriendships({ take: 100 })
      .then((res) => setFriends(res.data.filter(isAccepted)))
      .catch(() => setError("Không thể tải danh sách bạn bè"));
  }, []);

  const friendUserId = (f: FriendshipDto) => (user?.id === f.user1Id ? f.user2Id : f.user1Id);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    if (!user || isLoading) return;
    setError(null);
    const parsed = createGroupChatSchema(user.id).safeParse({
      name: name.trim() || undefined,
      memberIds: selectedIds,
      isRestricted,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }
    try {
      const conversationId = await createGroup(parsed.data);
      await appHub.joinConversation(conversationId).catch(() => {});
      router.replace(`/chat/${conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo nhóm chat");
    }
  };

  const canCreate = selectedIds.length >= 2 && !isLoading;

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="border-border flex items-center gap-3 border-b p-3">
        <button onClick={() => router.back()} className="hover:bg-muted rounded p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-semibold">Tạo nhóm</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-name" className="text-muted-foreground text-sm font-medium">
              Tên nhóm (tùy chọn)
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="VD: Weekend Trip"
              className="border-border focus:border-ring rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="border-border flex items-center justify-between rounded-lg border px-3 py-3">
            <div>
              <p className="text-sm font-medium">Nhóm riêng tư</p>
              <p className="text-muted-foreground text-xs">
                {isRestricted ? "Chủ nhóm duyệt yêu cầu tham gia" : "Ai cũng có thể tham gia"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRestricted((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isRestricted ? "bg-blue-600" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isRestricted ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              Thành viên ({selectedIds.length} chọn, cần ít nhất 2)
            </p>
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có bạn bè nào để thêm</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {friends.map((f) => {
                  const id = friendUserId(f);
                  const isSelected = selectedIds.includes(id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleSelect(id)}
                      className={`relative flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-600/10"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="bg-muted text-muted-foreground flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
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
                      <span className="text-muted-foreground max-w-full truncate text-[10px]">
                        {getNameDisplay(f.otherUserName)}
                      </span>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      <div className="border-border border-t p-3">
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isLoading ? "Đang tạo..." : "Tạo nhóm"}
        </button>
      </div>
    </div>
  );
}
