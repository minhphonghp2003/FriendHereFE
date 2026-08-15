"use client";

import { useState, useRef, TouchEvent } from "react";
import { useAppSelector } from "@/store/hooks";
import { ChevronUp, Users, BatteryCharging } from "lucide-react";
import { cn } from "@/lib/utils";

export function V2FriendsSheet() {
  const locations = useAppSelector((s) => s.location.locations);
  const myLatitude = useAppSelector((s) => s.location.latitude);
  const myLongitude = useAppSelector((s) => s.location.longitude);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(80);
  const [touchStart, setTouchStart] = useState(0);
  const [touchCurrent, setTouchCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const maxSheetHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 400;
  const minSheetHeight = 80;

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
    setTouchCurrent(e.targetTouches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.targetTouches[0].clientY;
    setTouchCurrent(currentY);
    
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
    const newHeight = windowHeight - currentY;
    
    const constrainedHeight = Math.max(minSheetHeight, Math.min(maxSheetHeight, newHeight));
    setSheetHeight(constrainedHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    const midpoint = (maxSheetHeight + minSheetHeight) / 2;
    
    if (sheetHeight > midpoint) {
      setSheetHeight(maxSheetHeight);
      setIsSheetOpen(true);
    } else {
      setSheetHeight(minSheetHeight);
      setIsSheetOpen(false);
    }
  };

  const toggleSheet = () => {
    if (isSheetOpen) {
      setSheetHeight(minSheetHeight);
      setIsSheetOpen(false);
    } else {
      setSheetHeight(maxSheetHeight);
      setIsSheetOpen(true);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${Math.round(distance)}km`;
  };

  return (
    <>
      {/* Drag Handle Button */}
      {/* <button 
        className="sheet-trigger-btn"
        onClick={toggleSheet}
        aria-label="Toggle friends list"
      >
        <Users className="trigger-icon" />
        <span className="trigger-count">{locations.length}</span>
      </button> */}

      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className="location-bottom-sheet"
        style={{ 
          height: `${sheetHeight}px`,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Drag Handle */}
        <div 
          className="sheet-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={toggleSheet}
        >
          <div className="drag-indicator" />
          <div className="sheet-preview">
            <div className="sheet-preview-info">
              <Users className="sheet-icon" />
              <span className="sheet-count">{locations.length} friends nearby</span>
            </div>
            <ChevronUp 
              className={cn("sheet-chevron", isSheetOpen && "sheet-chevron-rotated")} 
              size={20} 
            />
          </div>
        </div>

        {/* Sheet Content */}
        <div className="sheet-content">
          <div className="friends-scroll">
            {locations.map((location) => (
              <div key={location.userId} className="friend-card">
                <div className="friend-card-avatar">
                  <div className="friend-card-placeholder">
                    {location.name?.charAt(0) || "?"}
                  </div>
                  <div className="friend-status online" />
                </div>
                
                <div className="friend-card-info">
                  <h4 className="friend-card-name">{location.name || "User"}</h4>
                  <p className="friend-card-distance">
                    {myLatitude != null && myLongitude != null
                      ? `${calculateDistance(
                          myLatitude,
                          myLongitude,
                          location.latitude,
                          location.longitude
                        )} away`
                      : "Unknown distance"}
                  </p>
                  {location.battery != null && (
                    <div className="friend-card-battery">
                      <BatteryCharging className="battery-icon" size={12} />
                      <span>{location.battery}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {locations.length === 0 && (
              <div className="empty-state">
                <Users className="empty-icon" />
                <p className="empty-text">No friends nearby</p>
                <p className="empty-subtext">Share your location to see friends</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .sheet-trigger-btn {
          position: fixed;
          bottom: 100px;
          left: 20px;
          z-index: 2500;
          width: 56px;
          height: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 28px;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: float-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .trigger-icon {
          width: 24px;
          height: 24px;
        }

        .trigger-count {
          font-size: 11px;
          font-weight: 600;
        }

        @keyframes float-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sheet-trigger-btn:hover {
          transform: scale(1.05);
          background: rgba(20, 20, 20, 0.9);
        }

        .sheet-trigger-btn:active {
          transform: scale(0.95);
        }

        /* Bottom Sheet */
        .location-bottom-sheet {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2500;
          background: rgba(20, 20, 20, 0.92);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border-radius: 24px 24px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.4);
        }

        .sheet-drag-handle {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 16px;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
        }

        .sheet-drag-handle:active {
          cursor: grabbing;
        }

        .drag-indicator {
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.25);
          margin-bottom: 10px;
        }

        .sheet-preview {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 4px 4px;
        }

        .sheet-preview-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sheet-icon {
          width: 20px;
          height: 20px;
          color: #2BB0AF;
        }

        .sheet-count {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .sheet-chevron {
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sheet-chevron-rotated {
          transform: rotate(180deg);
        }

        .sheet-content {
          height: calc(100% - 64px);
          overflow: hidden;
        }

        .friends-scroll {
          height: 100%;
          overflow-y: auto;
          padding: 0 16px 24px;
          -webkit-overflow-scrolling: touch;
        }

        .friend-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          transition: background 0.2s;
        }

        .friend-card:active {
          background: rgba(255, 255, 255, 0.08);
        }

        .friend-card-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .friend-card-placeholder {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-size: 18px;
          font-weight: 600;
          color: white;
        }

        .friend-status {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid rgba(20, 20, 20, 0.9);
        }

        .friend-status.online {
          background: #22c55e;
        }

        .friend-card-info {
          flex: 1;
          min-width: 0;
        }

        .friend-card-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .friend-card-distance {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 2px 0 0;
        }

        .friend-card-battery {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 11px;
          color: #22c55e;
        }

        .battery-icon {
          color: #22c55e;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
        }

        .empty-icon {
          width: 40px;
          height: 40px;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 12px;
        }

        .empty-text {
          font-size: 15px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }

        .empty-subtext {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          margin: 4px 0 0;
        }
      `}</style>
    </>
  );
}