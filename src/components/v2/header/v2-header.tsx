"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Settings, RefreshCw } from "lucide-react";
import { RootState } from "@/store";
import { useCurrentUser } from "@/hooks/users/use-users";
import { useV2Modal } from "@/hooks/v2/use-v2-modal";
import { V2SettingsDialog } from "@/components/v2/dialogs/v2-settings-dialog";
import { V2UserDetailDialog } from "@/components/v2/dialogs/v2-user-detail-dialog";

type ActiveDialog = "settings" | "profile" | null;

export function V2Header() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const pathname = usePathname();
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();

  // Single active modal across the whole v2 app
  const settingsModal = useV2Modal("header-settings");
  const profileModal = useV2Modal("header-profile");

  // Hidden while browsing moments reels, composing, or on chrome-less pages
  // (compose-open is also used as a generic "hide header" signal).
  // isChatPage/isTimelinePage are derived from pathname so hiding also holds
  // after a hard reload (mount events can fire before listeners attach).
  const [momentsBrowsing, setMomentsBrowsing] = useState(false);
  const [composing, setComposing] = useState(false);
  const isMomentsPage = pathname?.startsWith("/moments") ?? false;
  const isTimelinePage = pathname?.startsWith("/timelines") ?? false;
  const isChatPage = pathname?.startsWith("/chat") ?? false;

  useEffect(() => {
    const onIndex = (e: Event) => {
      setMomentsBrowsing(((e as CustomEvent<number>).detail ?? 0) > 0);
    };
    const onComposeOpen = () => setComposing(true);
    const onComposeClose = () => setComposing(false);
    window.addEventListener("v2:moments-index", onIndex);
    window.addEventListener("v2:compose-open", onComposeOpen);
    window.addEventListener("v2:compose-close", onComposeClose);
    return () => {
      window.removeEventListener("v2:moments-index", onIndex);
      window.removeEventListener("v2:compose-open", onComposeOpen);
      window.removeEventListener("v2:compose-close", onComposeClose);
    };
  }, []);

  // Reset page-specific states when navigating away
  useEffect(() => {
    if (!isMomentsPage) setMomentsBrowsing(false);
    if (!isMomentsPage && !isTimelinePage) setComposing(false);
  }, [isMomentsPage, isTimelinePage]);

  const activeDialog: ActiveDialog = settingsModal.isOpen
    ? "settings"
    : profileModal.isOpen
      ? "profile"
      : null;

  const toggleDialog = (modal: { open: () => void; close: () => void; isOpen: boolean }) => {
    if (modal.isOpen) {
      modal.close();
    } else {
      modal.open(); // opening one closes the others automatically
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const displayName = currentUser?.name || authUser?.name || "User";
  const email = currentUser?.email || authUser?.email || "";
  const avatarThumb =
    currentUser?.images && currentUser.images[0]
      ? currentUser.images[0].thumbUrl || currentUser.images[0].originalUrl
      : undefined;

  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Calculate total unread count across all conversations
  const unreadCount = useSelector((state: RootState) =>
    state.chat.conversations.reduce((sum, conv) => sum + (conv.unreadCount ?? 0), 0),
  );

  // Full page reload avoids stacking extra SignalR connections
  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <>
      <header
        className={`v2-header lg-root lg-high ${momentsBrowsing || composing || isChatPage ? "v2-header-hidden" : ""}`}
      >
        <span className="lg-specular" aria-hidden />
        <span className="lg-shimmer" aria-hidden />
        <div className="header-left">
          <button
            className={`user-avatar-section ${activeDialog === "profile" ? "header-btn-active" : ""}`}
            onClick={() => toggleDialog(profileModal)}
            aria-label="Mở hồ sơ"
            aria-expanded={profileModal.isOpen}
          >
            <div className="user-avatar">
              {avatarThumb ? (
                <img src={avatarThumb} alt={displayName} className="user-avatar-img" />
              ) : (
                <span className="user-avatar-text">{initials}</span>
              )}
              <div className="avatar-status" />
            </div>
            <div className="user-text">
              <span className="user-name">{displayName}</span>
              {email && <span className="user-email">{email}</span>}
            </div>
          </button>
        </div>
        <div className="header-right">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="header-float-btn header-refresh-btn"
            aria-label="Làm mới"
          >
            <RefreshCw
              className={`header-float-icon header-icon-outline ${refreshing ? 'spinning' : ''}`}
            />
          </button>
          <button
            onClick={() => router.push("/chat")}
            className="header-float-btn"
            aria-label="Trò chuyện"
          >
            <MessageCircle className="header-float-icon" fill="currentColor" />
            {unreadCount > 0 && (
              <span className="chat-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => toggleDialog(settingsModal)}
            className={`header-float-btn ${settingsModal.isOpen ? 'header-btn-active' : ''}`}
            aria-label="Cài đặt"
            aria-expanded={settingsModal.isOpen}
          >
            <Settings className="header-float-icon" fill="currentColor" />
          </button>
        </div>
      </header>

      <V2SettingsDialog open={settingsModal.isOpen} onOpenChange={(open) => !open && settingsModal.close()} />
      <V2UserDetailDialog
        userId={profileModal.isOpen ? "me" : null}
        onClose={() => profileModal.close()}
      />

      <style jsx global>{`
        .v2-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          padding-top: calc(8px + env(safe-area-inset-top, 0px));
          /* liquid glass look comes from lg-root/lg-high classes */
          border-radius: 0 0 20px 20px;
          z-index: 1000;
          animation: header-float-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: auto;
          transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
        }

        /* Header children must layer above the lg-specular/lg-shimmer effects */
        .v2-header > .header-left,
        .v2-header > .header-right {
          position: relative;
          z-index: 2;
        }

        /* Hidden while browsing moments (reels) — slides up out of the way */
        .v2-header.v2-header-hidden {
          transform: translateY(-110%);
          opacity: 0;
          pointer-events: none;
        }

        @keyframes header-float-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header-left {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .user-avatar-section {
          display: flex;
          align-items: center;
          gap: 10px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          min-width: 0;
        }

        .user-avatar-section:active {
          opacity: 0.7;
        }

        .user-avatar {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: visible;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(43, 176, 175, 0.3);
          flex-shrink: 0;
        }

        .user-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-avatar-text {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .avatar-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid rgba(0, 0, 0, 0.4);
        }

        .user-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
          gap: 1px;
        }

        .user-name {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
        }

        .user-email {
          font-size: 11px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.55);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Floating white buttons with primary-colored icons */
        .header-float-btn {
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: none;
          border-radius: 50%;
          color: #2BB0AF; /* primary */
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          padding: 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .header-float-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.25);
        }

        .header-float-btn:active {
          transform: translateY(0) scale(0.95);
        }

        .header-float-icon {
          width: 17px;
          height: 17px;
          color: inherit;
        }

        /* Refresh keeps an outline icon */
        .header-icon-outline {
          fill: none;
        }

        .header-refresh-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .header-float-icon.spinning {
          animation: v2-refresh-spin 1s linear infinite;
        }

        @keyframes v2-refresh-spin {
          to { transform: rotate(360deg); }
        }

        .chat-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 700;
          min-width: 15px;
          height: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 2px solid white;
          padding: 0 3px;
        }

        /* Active state when modal is open */
        .header-float-btn.header-btn-active {
          background: #2BB0AF !important;
          color: white !important;
          box-shadow: 0 6px 20px rgba(43, 176, 175, 0.5), 0 2px 6px rgba(0, 0, 0, 0.25) !important;
        }

        .user-avatar-section.header-btn-active .user-avatar {
          border-color: rgba(43, 176, 175, 0.8);
          box-shadow: 0 0 12px rgba(43, 176, 175, 0.4);
        }
      `}</style>
    </>
  );
}