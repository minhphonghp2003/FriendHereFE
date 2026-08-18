"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Camera, ChevronsUp } from "lucide-react";
import { V2_LAST_PAGE_KEY } from "@/constants";

export function V2ToggleNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isMoments = pathname?.startsWith("/moments");
  const isHome = pathname?.startsWith("/location");
  // Chrome-less pages (chat, timeline detail) never show the nav button —
  // derived from pathname so it also holds after a hard reload
  const isChromeless =
    !!pathname && pathname.startsWith("/chat") || !!pathname && pathname.startsWith("/timelines");
  const targetRoute = isHome ? "/moments" : "/location";
  const Icon = isHome ? Camera : Home;
  const label = isHome ? "Moments" : "Home";

  // Persist the last open page so the next app launch resumes there.
  // Only the two root pages count (timeline detail etc. always resume home).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMoments) {
      window.localStorage.setItem(V2_LAST_PAGE_KEY, "moments");
    } else if (isHome) {
      window.localStorage.setItem(V2_LAST_PAGE_KEY, "home");
    }
  }, [isMoments, isHome]);

  // Move down (out of the way) while the nearby sheet is open or composing a post
  const [hidden, setHidden] = useState(false);

  // On the moments feed: browsing reels (index > 0) morphs the button into
  // scroll-to-top; the create card (index 0) shows the normal page toggle.
  const [browsingMoments, setBrowsingMoments] = useState(false);

  useEffect(() => {
    const open = () => setHidden(true);
    const close = () => setHidden(false);
    window.addEventListener("v2:sheet-open", open);
    window.addEventListener("v2:sheet-close", close);
    return () => {
      window.removeEventListener("v2:sheet-open", open);
      window.removeEventListener("v2:sheet-close", close);
    };
  }, []);

  useEffect(() => {
    // Reset browsing state when leaving the moments page
    if (!isMoments) {
      setBrowsingMoments(false);
      return;
    }
    const onIndex = (e: Event) => {
      const index = (e as CustomEvent<number>).detail ?? 0;
      setBrowsingMoments(index > 0);
    };
    window.addEventListener("v2:moments-index", onIndex);
    return () => {
      window.removeEventListener("v2:moments-index", onIndex);
    };
  }, [isMoments]);

  const handleClick = () => {
    if (isMoments && browsingMoments) {
      // Scroll the feed back to the create card
      window.dispatchEvent(new Event("v2:moments-scroll-top"));
    } else {
      router.push(targetRoute);
    }
  };

  const isScrollTop = isMoments && browsingMoments;
  const CurrentIcon = isScrollTop ? ChevronsUp : Icon;
  const ariaLabel = isScrollTop ? "Về camera" : `Đi đến ${label}`;

  return (
    <>
      <button
        onClick={handleClick}
        className={`v2-toggle-btn ${!isHome && !isScrollTop ? 'toggle-moments-active' : ''} ${hidden || isChromeless ? 'sheet-open' : ''} ${isScrollTop ? 'scroll-top-mode' : ''}`}
        aria-label={ariaLabel}
      >
        <div className="toggle-icon-wrapper">
          <div className="toggle-content">
            <CurrentIcon className="toggle-icon" />
          </div>
          <div className="toggle-glow" />
        </div>
      </button>

      <style jsx global>{`
        .v2-toggle-btn {
          position: fixed;
          right: 20px;
          bottom: 130px; /* moved up to avoid camera controls at bottom */
          z-index: 500; /* below header (1000) and all other components */
          width: 56px; /* made smaller */
          height: 56px; /* made smaller */
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          animation: toggle-float-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transition: bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
        }

        /* Slide down + fade when the nearby sheet is open / composing a post */
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
          width: 48px; /* made smaller to match button size */
          height: 48px; /* made smaller to match button size */
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2BB0AF 0%, #1a8a89 100%);
          border-radius: 24px; /* adjusted for smaller size */
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

        /* Scroll-to-top mode: small circle like the posting close button.
           Anchored right above the moment info sheet — the reel publishes its
           actual height via --vm-sheet-h (no pixel guessing). */
        .v2-toggle-btn.scroll-top-mode {
          width: 38px;
          height: 38px;
          right: 20px;
          bottom: calc(var(--vm-sheet-h, 150px) + 12px + env(safe-area-inset-bottom, 0px));
          z-index: 100; /* below fullscreen media (9998) but above base UI */
        }

        .v2-toggle-btn.scroll-top-mode .toggle-content {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }

        .v2-toggle-btn.scroll-top-mode .toggle-icon {
          color: white;
          width: 20px;
          height: 20px;
        }

        .v2-toggle-btn.scroll-top-mode .toggle-glow {
          display: none;
        }

        .v2-toggle-btn.scroll-top-mode:hover .toggle-content {
          transform: scale(1.08);
          background: rgba(0, 0, 0, 0.7);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
        }

        .v2-toggle-btn:hover .toggle-content {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(43, 176, 175, 0.5),
                      0 0 0 6px rgba(43, 176, 175, 0.15),
                      inset 0 0 20px rgba(255, 255, 255, 0.15);
        }

        .v2-toggle-btn:active .toggle-content {
          transform: scale(0.95);
        }

        .toggle-icon {
          width: 24px; /* made smaller for smaller button */
          height: 24px; /* made smaller for smaller button */
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
