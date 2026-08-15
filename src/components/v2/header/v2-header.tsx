"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { MessageCircle, Settings, RefreshCw } from "lucide-react";
import { RootState } from "@/store";
import { useCurrentUser } from "@/hooks/users/use-users";
import { V2ChatDialog } from "@/components/v2/dialogs/v2-chat-dialog";
import { V2SettingsDialog } from "@/components/v2/dialogs/v2-settings-dialog";
import { V2ProfileDialog } from "@/components/v2/dialogs/v2-profile-dialog";

export function V2Header() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { data: currentUser } = useCurrentUser();
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = currentUser?.name || authUser?.name || "User";
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
      <header className="v2-header">
        <div className="header-left">
          <button
            className="user-avatar-section"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Open profile"
            aria-expanded={profileOpen}
          >
            <div className="user-avatar">
              {avatarThumb ? (
                <img src={avatarThumb} alt={displayName} className="user-avatar-img" />
              ) : (
                <span className="user-avatar-text">{initials}</span>
              )}
              <div className="avatar-status" />
            </div>
            <span className="user-name">{displayName}</span>
          </button>
        </div>
        <div className="header-right">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="header-icon-btn header-refresh-btn"
            aria-label="Refresh"
          >
            <RefreshCw className={`header-icon ${refreshing ? 'spinning' : ''}`} />
          </button>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`header-chat-btn ${chatOpen ? 'header-btn-active' : ''}`}
            aria-label="Chat"
            aria-expanded={chatOpen}
          >
            <MessageCircle className="chat-icon" />
            {unreadCount > 0 && (
              <span className="chat-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`header-icon-btn ${settingsOpen ? 'header-btn-active' : ''}`}
            aria-label="Settings"
            aria-expanded={settingsOpen}
          >
            <Settings className="header-icon" />
          </button>
        </div>
      </header>

      <V2ChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      <V2SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <V2ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

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
          background: transparent;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: none;
          box-shadow: none;
          z-index: 1000;
          animation: header-float-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: auto;
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
          gap: 8px;
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
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
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
          object-fit: cover;
        }

        .user-avatar-text {
          font-size: 12px;
          font-weight: 600;
          color: white;
        }

        .avatar-status {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .header-icon.spinning {
          animation: v2-refresh-spin 1s linear infinite;
        }

        @keyframes v2-refresh-spin {
          to { transform: rotate(360deg); }
        }

        .header-chat-btn {
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(43, 176, 175, 0.15);
          border: 1px solid rgba(43, 176, 175, 0.3);
          border-radius: 50%;
          color: #2BB0AF;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          padding: 0;
        }

        .header-chat-btn:hover {
          background: rgba(43, 176, 175, 0.25);
          border-color: rgba(43, 176, 175, 0.5);
          transform: scale(1.05);
        }

        .header-chat-btn:active {
          transform: scale(0.95);
        }

        .chat-icon {
          width: 18px;
          height: 18px;
          color: inherit;
        }

        .chat-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          font-size: 9px;
          font-weight: 700;
          min-width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          border: 2px solid rgba(0, 0, 0, 0.3);
          padding: 0 3px;
        }

        .header-icon-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          padding: 0;
        }

        .header-icon-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
          transform: scale(1.05);
        }

        .header-icon-btn:active {
          transform: scale(0.95);
        }

        .header-icon {
          width: 16px;
          height: 16px;
          color: inherit;
        }

        /* Active state when modal is open */
        .header-btn-active {
          background: rgba(43, 176, 175, 0.4) !important;
          border-color: rgba(43, 176, 175, 0.7) !important;
          color: #2BB0AF !important;
          box-shadow: 0 0 16px rgba(43, 176, 175, 0.3) !important;
        }

        .header-icon-btn.header-btn-active {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
          color: white !important;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.15) !important;
        }

        .user-avatar-section.header-btn-active .user-avatar {
          border-color: rgba(43, 176, 175, 0.8);
          box-shadow: 0 0 12px rgba(43, 176, 175, 0.4);
        }
      `}</style>
    </>
  );
}