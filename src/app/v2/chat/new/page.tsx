"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send, X } from "lucide-react";
import { createConversation, getMessages } from "@/services/chat";
import { getMomentById, getMomentThumbnail } from "@/services/moment";
import { appHub } from "@/lib/signalr/app-hub";
import { LoadingVideo } from "@/components/common/loading-video";

export default function V2NewChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiverId = Number(searchParams.get("receiverId")) || null;
  const receiverName = searchParams.get("name") ?? "Chat";
  const momentIdParam = searchParams.get("momentId") ? Number(searchParams.get("momentId")) : null;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [momentThumb, setMomentThumb] = useState<string | null>(null);

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
    if (!receiverId) {
      router.replace("/v2/chat");
    }
  }, [receiverId, router]);

  useEffect(() => {
    if (momentIdParam) {
      getMomentById(momentIdParam)
        .then((res) => {
          if (res.success && res.data) {
            const thumb = getMomentThumbnail(res.data);
            setMomentThumb(thumb?.thumbUrl ?? null);
          }
        })
        .catch(() => {});
    }
  }, [momentIdParam]);

  const handleSend = async () => {
    const text = input.trim();
    if (!receiverId || (!text && !momentIdParam) || sending) return;
    setSending(true);
    try {
      // v1 flow: createConversation carries the first message (content + momentId)
      const res = await createConversation(
        receiverId,
        text || null,
        0,
        momentIdParam ?? null,
      );
      if (!res.success || !res.data) {
        throw new Error("Không thể tạo cuộc trò chuyện");
      }
      const conversationId = res.data;
      await appHub.joinConversation(conversationId).catch(() => {});
      router.replace(`/v2/chat/${conversationId}`);
    } catch (err) {
      console.error("Failed to create conversation", err);
      setSending(false);
    }
  };

  if (!receiverId) {
    return (
      <div className="vcn2-page">
        <div className="vcn2-loading">
          <LoadingVideo size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="vcn2-page">
      <div className="vcn2-header">
        <button onClick={() => router.back()} className="vcn2-icon-btn" aria-label="Quay lại">
          <ArrowLeft className="vcn2-icon" />
        </button>
        <p className="vcn2-title">{receiverName}</p>
      </div>

      <div className="vcn2-body">
        {momentThumb && (
          <div className="vcn2-moment-wrap">
            <img src={momentThumb} alt="" className="vcn2-moment-thumb" />
            <button
              className="vcn2-thumb-remove"
              onClick={() => setMomentThumb(null)}
              aria-label="Xóa khoảnh khắc"
            >
              <X className="vcn2-thumb-remove-icon" />
            </button>
          </div>
        )}
      </div>

      <div className="vcn2-composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Nhập tin nhắn..."
          autoFocus
          className="vcn2-input"
        />
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !momentThumb) || sending}
          className="vcn2-send-btn"
          aria-label="Gửi"
        >
          <Send className="vcn2-send-icon" />
        </button>
      </div>

      <style jsx global>{`
        .vcn2-page {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(circle at 15% 20%, rgba(43, 176, 175, 0.35), transparent 50%),
            radial-gradient(circle at 85% 85%, rgba(43, 176, 175, 0.28), transparent 50%),
            var(--vm-bg, #f4f4f5);
          color: var(--vm-text, #18181b);
        }

        .vcn2-loading {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcn2-header {
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

        .vcn2-icon-btn {
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

        .vcn2-icon-btn:active {
          background: rgba(43, 176, 175, 0.12);
        }

        .vcn2-icon {
          width: 19px;
          height: 19px;
        }

        .vcn2-title {
          flex: 1;
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcn2-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .vcn2-moment-wrap {
          position: relative;
          display: inline-block;
        }

        .vcn2-moment-thumb {
          width: 90px;
          height: 90px;
          border-radius: 14px;
          object-fit: cover;
          display: block;
        }

        .vcn2-thumb-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 22px;
          height: 22px;
          border: none;
          border-radius: 50%;
          background: var(--vm-surface, #fff);
          color: var(--vm-text, #18181b);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          padding: 0;
        }

        .vcn2-thumb-remove-icon {
          width: 13px;
          height: 13px;
        }

        .vcn2-composer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--vm-border, #e4e4e7);
          background: color-mix(in srgb, var(--vm-surface, #fff) 75%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .vcn2-input {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 14px;
          outline: none;
          color: var(--vm-text, #18181b);
        }

        .vcn2-send-btn {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(43, 176, 175, 0.4);
        }

        .vcn2-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .vcn2-send-icon {
          width: 16px;
          height: 16px;
          margin-left: 1px;
        }
      `}</style>
    </div>
  );
}
