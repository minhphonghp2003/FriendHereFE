"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Camera } from "lucide-react";

export function V2ToggleNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname?.startsWith("/v2/location");
  const targetRoute = isHome ? "/v2/moments" : "/v2/location";
  const Icon = isHome ? Camera : Home;
  const label = isHome ? "Moments" : "Home";

  // Move down (out of the way) while the nearby sheet is open
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const open = () => setSheetOpen(true);
    const close = () => setSheetOpen(false);
    window.addEventListener("v2:sheet-open", open);
    window.addEventListener("v2:sheet-close", close);
    return () => {
      window.removeEventListener("v2:sheet-open", open);
      window.removeEventListener("v2:sheet-close", close);
    };
  }, []);

  const handleToggle = () => {
    router.push(targetRoute);
  };

  return (
    <>
      <button 
        onClick={handleToggle}
        className={`v2-toggle-btn ${isHome ? '' : 'toggle-moments-active'} ${sheetOpen ? 'sheet-open' : ''}`}
        aria-label={`Go to ${label}`}
      >
        <div className="toggle-icon-wrapper">
          <div className="toggle-content">
            <Icon className="toggle-icon" />
          </div>
          <div className="toggle-glow" />
        </div>
      </button>

      <style jsx global>{`
        .v2-toggle-btn {
          position: fixed;
          right: 20px;
          bottom: 100px;
          z-index: 2000;
          width: 72px;
          height: 72px;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          animation: toggle-float-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transition: bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
        }

        /* Slide down + fade when the nearby sheet is open */
        .v2-toggle-btn.sheet-open {
          bottom: -100px;
          opacity: 0;
          pointer-events: none;
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

        .toggle-moments-active .toggle-content {
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

        .v2-toggle-btn:hover .toggle-moments-active .toggle-content {
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
      `}</style>
    </>
  );
}