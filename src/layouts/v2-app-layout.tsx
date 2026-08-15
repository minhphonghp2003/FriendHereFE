"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Camera,
  MessageCircle,
  Settings,
  User
} from "lucide-react";
import Link from "next/link";
import { SwipeContainer } from "@/components/mobile/swipe-container";
import { applyV2Theme } from "@/config/v2-theme";

// Apply v2 theme on mount
if (typeof window !== 'undefined') {
  applyV2Theme();
}

interface V2AppLayoutProps {
  children: React.ReactNode;
}

export function V2AppLayout({ children }: V2AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    // Determine active tab from pathname
    if (pathname?.startsWith("/v2/location")) {
      setActiveTab("home");
    } else if (pathname?.startsWith("/v2/moments")) {
      setActiveTab("moments");
    }
  }, [pathname]);

  const togglePage = () => {
    if (activeTab === "home") {
      router.push("/v2/moments");
    } else {
      router.push("/v2/location");
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const tabs = ['home', 'moments'];
    const currentIndex = tabs.indexOf(activeTab);
    
    if (direction === 'left' && currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      router.push(nextTab === 'home' ? '/v2/location' : '/v2/moments');
    } else if (direction === 'right' && currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      router.push(prevTab === 'home' ? '/v2/location' : '/v2/moments');
    }
  };

  const toggleIcon = activeTab === "home" ? Camera : Home;

  return (
    <div className="v2-app v2-theme">
      {/* V2 Header with Chat Bubble - Floating outside */}
      <header className="v2-header">
        <div className="header-left">
          <div className="user-avatar-section">
            <div className="user-avatar">
              <span className="user-avatar-text">JD</span>
              <div className="avatar-status" />
            </div>
            <span className="user-name">John Doe</span>
          </div>
        </div>
        <div className="header-right">
          <Link 
            href="/v2/chat" 
            className="header-chat-btn"
            aria-label="Chat"
          >
            <MessageCircle className="chat-icon" />
            <span className="chat-badge">3</span>
          </Link>
          <button className="header-icon-btn" aria-label="Settings">
            <Settings className="header-icon" />
          </button>
          <button className="header-icon-btn" aria-label="Profile">
            <User className="header-icon" />
          </button>
        </div>
      </header>

      {/* Main Content Area with Swipe Support */}
      <SwipeContainer
        onSwipeLeft={() => handleSwipe('left')}
        onSwipeRight={() => handleSwipe('right')}
        className="v2-content"
      >
        {children}
      </SwipeContainer>

      {/* Single Toggle Button */}
      <button 
        onClick={togglePage}
        className="v2-toggle-btn"
        aria-label={activeTab === "home" ? "Go to Moments" : "Go to Home"}
      >
        <div className="toggle-icon-wrapper">
          <div 
            className={cn(
              "toggle-content",
              activeTab === "moments" && "toggle-moments"
            )}
          >
            {activeTab === "home" ? (
              <Camera className="toggle-icon" />
            ) : (
              <Home className="toggle-icon" />
            )}
          </div>
          <div className="toggle-glow" />
        </div>
      </button>

      <style jsx global>{`
        .v2-app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: relative;
          background: #000;
        }

        .v2-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          position: relative;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        /* V2 Header */
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

        .v2-app {
          position: relative;
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

        /* Single Toggle Button */
        .v2-toggle-btn {
          position: fixed;
          right: 20px;
          bottom: 100px; /* Moved down to be near the collapsed sheet */
          z-index: 2000;
          width: 72px;
          height: 72px;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          animation: toggle-float-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes toggle-float-in {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .toggle-icon-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-content {
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          border-radius: 32px;
          border: 2px solid rgba(43, 176, 175, 0.6);
          box-shadow: 0 8px 32px rgba(43, 176, 175, 0.4),
                      0 0 0 4px rgba(43, 176, 175, 0.1),
                      inset 0 0 20px rgba(255, 255, 255, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .toggle-content.toggle-moments {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: rgba(102, 126, 234, 0.6);
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4),
                      0 0 0 4px rgba(102, 126, 234, 0.1),
                      inset 0 0 20px rgba(255, 255, 255, 0.1);
        }

        .v2-toggle-btn:hover .toggle-content {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(43, 176, 175, 0.5),
                      0 0 0 6px rgba(43, 176, 175, 0.15),
                      inset 0 0 20px rgba(255, 255, 255, 0.15);
        }

        .v2-toggle-btn:hover .toggle-content.toggle-moments {
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5),
                      0 0 0 6px rgba(102, 126, 234, 0.15),
                      inset 0 0 20px rgba(255, 255, 255, 0.15);
        }

        .v2-toggle-btn:active .toggle-content {
          transform: scale(0.95);
        }

        .toggle-icon {
          width: 32px;
          height: 32px;
          color: white;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toggle-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: toggle-pulse 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes toggle-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.3);
          }
        }

        /* Hide scrollbar but keep functionality */
        .v2-content::-webkit-scrollbar {
          display: none;
        }

        .v2-content {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}