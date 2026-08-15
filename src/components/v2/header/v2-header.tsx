"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { MessageCircle, Settings, User } from "lucide-react";
import { RootState } from "@/store";
import { V2ChatDialog } from "@/components/v2/dialogs/v2-chat-dialog";
import { V2SettingsDialog } from "@/components/v2/dialogs/v2-settings-dialog";
import { V2ProfileDialog } from "@/components/v2/dialogs/v2-profile-dialog";

export function V2Header() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = user?.name || "User";
  const initials = displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="v2-header">
        <div className="header-left">
          <div className="user-avatar-section">
            <div className="user-avatar">
              <span className="user-avatar-text">{initials}</span>
              <div className="avatar-status" />
            </div>
            <span className="user-name">{displayName}</span>
          </div>
        </div>
        <div className="header-right">
          <button 
            onClick={() => setChatOpen(true)}
            className={`header-chat-btn ${chatOpen ? 'header-btn-active' : ''}`}
            aria-label="Chat"
          >
            <MessageCircle className="chat-icon" />
            <span className="chat-badge">3</span>
          </button>
          <button 
            onClick={() => setSettingsOpen(true)}
            className={`header-icon-btn ${settingsOpen ? 'header-btn-active' : ''}`}
            aria-label="Settings"
          >
            <Settings className="header-icon" />
          </button>
          <button 
            onClick={() => setProfileOpen(true)}
            className={`header-icon-btn ${profileOpen ? 'header-btn-active' : ''}`}
            aria-label="Profile"
          >
            <User className="header-icon" />
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
        }

        .user-avatar-section {
          display: flex;
          align-items: center;
          gap: 8px;
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
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
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
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
      `}</style>
    </>
  );
}