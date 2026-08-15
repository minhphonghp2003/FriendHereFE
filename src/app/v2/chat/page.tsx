"use client";

import { useState } from "react";
import { ArrowLeft, Search, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function V2ChatPage() {
  const [conversations] = useState([
    {
      id: "1",
      name: "Alice Johnson",
      avatar: "A",
      lastMessage: "Hey! Are you coming to the party?",
      time: "2m ago",
      unread: 2,
      online: true
    },
    {
      id: "2", 
      name: "Bob Smith",
      avatar: "B",
      lastMessage: "That sounds great! Let's do it",
      time: "15m ago",
      unread: 0,
      online: false
    },
    {
      id: "3",
      name: "Friends Group",
      avatar: "🎉",
      lastMessage: "Meeting at 7pm tomorrow",
      time: "1h ago",
      unread: 5,
      online: true,
      isGroup: true
    }
  ]);

  return (
    <div className="v2-chat-container">
      {/* Header */}
      <div className="chat-header">
        <Link href="/v2/location" className="back-btn">
          <ArrowLeft className="back-icon" />
        </Link>
        <h1 className="chat-title">Messages</h1>
        <button className="new-chat-btn" aria-label="New chat">
          <Plus className="new-chat-icon" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-wrapper">
          <Search className="search-icon" />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="search-input"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        {conversations.map((conv) => (
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            className="conversation-item"
          >
            <div className="conversation-avatar">
              <div className="avatar-circle">
                {conv.avatar}
              </div>
              {conv.online && !conv.isGroup && (
                <div className="online-indicator" />
              )}
            </div>
            
            <div className="conversation-content">
              <div className="conversation-header">
                <h3 className="conversation-name">{conv.name}</h3>
                <span className="conversation-time">{conv.time}</span>
              </div>
              
              <div className="conversation-footer">
                <p className="conversation-message">{conv.lastMessage}</p>
                {conv.unread > 0 && (
                  <span className="unread-badge">{conv.unread}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx global>{`
        .v2-chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #000;
        }

        /* Header */
        .chat-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .back-icon {
          width: 20px;
          height: 20px;
        }

        .chat-title {
          flex: 1;
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .new-chat-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(43, 176, 175, 0.2);
          border: 1px solid rgba(43, 176, 175, 0.4);
          border-radius: 50%;
          color: #2BB0AF;
          transition: all 0.3s ease;
        }

        .new-chat-btn:hover {
          background: rgba(43, 176, 175, 0.3);
        }

        .new-chat-icon {
          width: 20px;
          height: 20px;
        }

        /* Search Bar */
        .search-bar {
          padding: 12px 20px;
        }

        .search-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 10px 16px;
        }

        .search-icon {
          width: 18px;
          height: 18px;
          color: rgba(255, 255, 255, 0.5);
        }

        .search-input {
          flex: 1;
          background: none;
          border: none;
          color: white;
          font-size: 14px;
          outline: none;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        /* Conversations List */
        .conversations-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
        }

        .conversations-list::-webkit-scrollbar {
          display: none;
        }

        .conversation-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          margin-bottom: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .conversation-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .conversation-item:active {
          transform: scale(0.98);
        }

        .conversation-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 600;
          color: white;
        }

        .online-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }

        .conversation-content {
          flex: 1;
          min-width: 0;
        }

        .conversation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .conversation-name {
          font-size: 15px;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .conversation-time {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .conversation-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .conversation-message {
          flex: 1;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .unread-badge {
          background: #2BB0AF;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          padding: 0 6px;
        }
      `}</style>
    </div>
  );
}