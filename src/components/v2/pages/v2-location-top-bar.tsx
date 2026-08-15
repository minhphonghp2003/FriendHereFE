"use client";

export function V2LocationTopBar() {
  return (
    <div className="v2-location-topbar">
      {/* Top bar can show map-specific controls */}
      <div className="topbar-left">
        <div className="zoom-controls">
          <button className="zoom-btn" aria-label="Zoom in">+</button>
          <button className="zoom-btn" aria-label="Zoom out">-</button>
        </div>
      </div>
      
      <div className="topbar-right">
        <button className="topbar-btn" aria-label="Map style">
          <svg className="topbar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v6m0 0l-6 3m0 0l6-3m6 3v6m-6-3h6" />
          </svg>
        </button>
      </div>
      
      <style jsx global>{`
        .v2-location-topbar {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          z-index: 100;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          padding-top: calc(8px + env(safe-area-inset-top, 0px));
          background: transparent;
          pointer-events: none;
        }

        .topbar-left,
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
        }

        .zoom-controls {
          display: flex;
          gap: 4px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 4px 8px;
        }

        .zoom-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .zoom-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .zoom-btn:active {
          transform: scale(0.95);
        }

        .topbar-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .topbar-btn:hover {
          background: rgba(0, 0, 0, 0.6);
        }

        .topbar-icon {
          width: 18px;
          height: 18px;
        }
      `}</style>
    </div>
  );
}