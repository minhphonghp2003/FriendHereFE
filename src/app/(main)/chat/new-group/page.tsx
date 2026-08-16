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

export default function V2NewGroupChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { mutate: createGroup, isLoading } = useCreateGroupChat();
  const [friends, setFriends] = useState<FriendshipDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== v2 chrome: hide header + nav button while on this page =====
  useEffect(() => {
    window.dispatchEvent(new Event("v2:close-modals"));
    window.dispatchEvent(new Event("v2:sheet-open"));
    window.dispatchEvent(new Event("v2:compose-open"));
    return () => {
      window.dispatchEvent(new Event("v2:sheet-close"));
      window.dispatchEvent(new Event("v2:compose-close"));
    };
  }, []);

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
    <div className="vcg2-page">
      <div className="vcg2-header">
        <button onClick={() => router.back()} className="vcg2-icon-btn" aria-label="Quay lại">
          <ArrowLeft className="vcg2-icon" />
        </button>
        <p className="vcg2-title">Tạo nhóm</p>
      </div>

      <div className="vcg2-body">
        <div className="vcg2-field">
          <label htmlFor="group-name" className="vcg2-label">
            Tên nhóm (tùy chọn)
          </label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="VD: Weekend Trip"
            className="vcg2-input"
          />
        </div>

        <div className="vcg2-restricted">
          <div>
            <p className="vcg2-restricted-title">Nhóm riêng tư</p>
            <p className="vcg2-restricted-sub">
              {isRestricted ? "Chủ nhóm duyệt yêu cầu tham gia" : "Ai cũng có thể tham gia"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRestricted((v) => !v)}
            className={`vcg2-switch ${isRestricted ? "on" : ""}`}
            aria-label="Nhóm riêng tư"
          >
            <span className="vcg2-switch-knob" />
          </button>
        </div>

        <div className="vcg2-members">
          <p className="vcg2-label">Thành viên ({selectedIds.length} chọn, cần ít nhất 2)</p>
          {friends.length === 0 ? (
            <p className="vcg2-empty">Không có bạn bè nào để thêm</p>
          ) : (
            <div className="vcg2-grid">
              {friends.map((f) => {
                const id = friendUserId(f);
                const isSelected = selectedIds.includes(id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleSelect(id)}
                    className={`vcg2-friend ${isSelected ? "selected" : ""}`}
                  >
                    <div className="vcg2-friend-avatar">
                      {f.otherUserImage ? (
                        <img
                          src={f.otherUserImage.thumbUrl}
                          alt={f.otherUserName}
                          className="vcg2-friend-img"
                        />
                      ) : (
                        <span className="vcg2-friend-letter">{getNameDisplay(f.otherUserName)}</span>
                      )}
                    </div>
                    <span className="vcg2-friend-name">{getNameDisplay(f.otherUserName)}</span>
                    {isSelected && (
                      <span className="vcg2-friend-check">
                        <Check className="vcg2-check-icon" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="vcg2-error">{error}</p>}
      </div>

      <div className="vcg2-footer">
        <button onClick={handleCreate} disabled={!canCreate} className="vcg2-create-btn">
          {isLoading ? <Loader2 className="vcg2-spin" /> : <UserPlus className="vcg2-create-icon" />}
          {isLoading ? "Đang tạo..." : "Tạo nhóm"}
        </button>
      </div>

      <style jsx global>{`
        .vcg2-page {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--vm-bg, #f4f4f5);
          color: var(--vm-text, #18181b);
        }

        .vcg2-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          padding-top: calc(8px + env(safe-area-inset-top, 0px));
          border-bottom: 1px solid var(--vm-border, #e4e4e7);
          background: color-mix(in srgb, var(--vm-surface, #fff) 65%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .vcg2-icon-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          border-radius: 50%;
          color: var(--vm-text-2, #52525b);
          cursor: pointer;
        }

        .vcg2-icon-btn:active {
          background: rgba(43, 176, 175, 0.12);
        }

        .vcg2-icon {
          width: 19px;
          height: 19px;
        }

        .vcg2-title {
          flex: 1;
          margin: 0;
          font-size: 15px;
          font-weight: 800;
        }

        .vcg2-body {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .vcg2-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .vcg2-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--vm-text-2, #52525b);
          margin: 0;
        }

        .vcg2-input {
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 15px;
          outline: none;
          color: var(--vm-text, #18181b);
        }

        .vcg2-restricted {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          border-radius: 14px;
          padding: 12px 14px;
        }

        .vcg2-restricted-title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }

        .vcg2-restricted-sub {
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcg2-switch {
          position: relative;
          width: 44px;
          height: 24px;
          border: none;
          border-radius: 999px;
          background: var(--vm-surface-2, #f4f4f5);
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s;
          padding: 0;
        }

        .vcg2-switch.on {
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
        }

        .vcg2-switch-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
          transition: transform 0.2s;
        }

        .vcg2-switch.on .vcg2-switch-knob {
          transform: translateX(20px);
        }

        .vcg2-members {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .vcg2-empty {
          margin: 0;
          font-size: 13px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcg2-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .vcg2-friend {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          border: 1.5px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          border-radius: 14px;
          padding: 10px 4px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .vcg2-friend.selected {
          border-color: #2bb0af;
          background: rgba(43, 176, 175, 0.08);
        }

        .vcg2-friend-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vm-surface-2, #f4f4f5);
        }

        .vcg2-friend-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vcg2-friend-letter {
          font-size: 12px;
          font-weight: 800;
          color: var(--vm-text-2, #52525b);
        }

        .vcg2-friend-name {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcg2-friend-check {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #2bb0af;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcg2-check-icon {
          width: 11px;
          height: 11px;
        }

        .vcg2-error {
          margin: 0;
          font-size: 13px;
          color: #ef4444;
        }

        .vcg2-footer {
          border-top: 1px solid var(--vm-border, #e4e4e7);
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          background: color-mix(in srgb, var(--vm-surface, #fff) 75%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .vcg2-create-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 999px;
          padding: 12px;
          font-size: 14px;
          font-weight: 800;
          color: white;
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(43, 176, 175, 0.4);
        }

        .vcg2-create-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .vcg2-create-icon {
          width: 16px;
          height: 16px;
        }

        .vcg2-spin {
          width: 16px;
          height: 16px;
          animation: vcg2-rotate 1s linear infinite;
        }

        @keyframes vcg2-rotate {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
