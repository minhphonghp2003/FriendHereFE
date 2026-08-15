"use client";

import { useEffect, useState, useRef, TouchEvent } from "react";
import { useSelector } from "react-redux";
import { useTheme } from "next-themes";
import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { RootState } from "@/store";
import { SignalRProvider } from "@/providers/signalr-provider";
import { useLocations } from "@/hooks/use-locations";
import { 
  Users,
  BatteryCharging,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function V2LocationPage() {
  const { locations, myLocation } = useLocations();
  const { resolvedTheme } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(80); // collapsed height in px
  const [touchStart, setTouchStart] = useState(0);
  const [touchCurrent, setTouchCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const maxSheetHeight = window.innerHeight - 100; // Allow sheet to go near top
  const minSheetHeight = 80; // minimum collapsed height in px
  
  // Apply theme-based map styling like V1
  const mapColorScheme = resolvedTheme === "dark" ? "DARK" : "LIGHT";
  const dragHandleHeight = 40; // height of the drag handle area

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setTouchCurrent(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    setTouchCurrent(currentY);
    
    const deltaY = touchStart - currentY;
    const windowHeight = window.innerHeight;
    const newHeight = windowHeight - currentY;
    
    // Constrain the height
    const constrainedHeight = Math.max(minSheetHeight, Math.min(maxSheetHeight, newHeight));
    setSheetHeight(constrainedHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Only snap to either closed or fullscreen
    const midpoint = (maxSheetHeight + minSheetHeight) / 2;
    
    if (sheetHeight > midpoint) {
      setSheetHeight(maxSheetHeight); // Snap to fullscreen
      setIsSheetOpen(true);
    } else {
      setSheetHeight(minSheetHeight); // Snap to closed
      setIsSheetOpen(false);
    }
  };

  const toggleSheet = () => {
    if (isSheetOpen) {
      setSheetHeight(minSheetHeight);
      setIsSheetOpen(false);
    } else {
      setSheetHeight(maxSheetHeight); // Open directly to fullscreen
      setIsSheetOpen(true);
    }
  };

  const closeSheet = () => {
    setSheetHeight(minSheetHeight);
    setIsSheetOpen(false);
  };

  const openSheet = () => {
    setSheetHeight(maxSheetHeight); // Open directly to fullscreen
    setIsSheetOpen(true);
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <p className="text-red-400">Google Maps API Key is missing</p>
      </div>
    );
  }

  // Always use light map styling
  const lightMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    {
      featureType: "administrative.land_parcel",
      elementType: "labels.text.fill",
      stylers: [{ color: "#bdbdbd" }],
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ color: "#eeeeee" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#757575" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#e5e5e5" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#ffffff" }],
    },
    {
      featureType: "road",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#616161" }],
    },
    {
      featureType: "road.local",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#c9c9c9" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9e9e9e" }],
    },
  ];

  return (
      <SignalRProvider>
        <div className="v2-location-container">
          {/* Map Background */}
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <div className="map-wrapper">
              <GoogleMap
                defaultCenter={{ lat: 21.0285, lng: 105.8542 }}
                defaultZoom={15}
                mapId="v2-location-map"
                disableDefaultUI
                gestureHandling={"greedy"}
                className="v2-map"
                colorScheme={mapColorScheme}
              >
              {/* Render friend locations */}
              {locations.map((location) => (
                <AdvancedMarker
                  key={location.userId}
                  position={{ 
                    lat: location.latitude, 
                    lng: location.longitude 
                  }}
                  className="location-marker"
                >
                  <div className="custom-marker">
                    <div className="marker-avatar">
                      {location.avatarUrl ? (
                        <img 
                          src={location.avatarUrl} 
                          alt={location.fullName}
                          className="marker-avatar-img"
                        />
                      ) : (
                        <div className="marker-avatar-placeholder">
                          {location.fullName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="marker-pulse" />
                  </div>
                </AdvancedMarker>
              ))}

              {/* Current user marker */}
              {myLocation && (
                <AdvancedMarker
                  position={{ 
                    lat: myLocation.latitude, 
                    lng: myLocation.longitude 
                  }}
                  className="current-user-marker"
                >
                  <div className="current-user-pulse" />
                </AdvancedMarker>
              )}
             </GoogleMap>
           </div>
         </APIProvider>

         {/* Bottom Sheet - Friends Nearby */}
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
                className={cn("sheet-chevron-icon", isSheetOpen && "sheet-chevron-rotated")} 
                size={20} 
              />
            </div>
          </div>

          {/* Sheet Content */}
          <div className="sheet-content">
            <div className="cards-header">
              <h3 className="cards-title">Friends Nearby</h3>
              <span className="cards-count">{locations.length} online</span>
            </div>
            
            <div className="friends-scroll">
              {locations.map((location) => (
                <div key={location.userId} className="friend-card">
                  <div className="friend-card-avatar">
                    {location.avatarUrl ? (
                      <img 
                        src={location.avatarUrl} 
                        alt={location.fullName}
                        className="friend-card-image"
                      />
                    ) : (
                      <div className="friend-card-placeholder">
                        {location.fullName?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="friend-status online" />
                  </div>
                  
                  <div className="friend-card-info">
                    <h4 className="friend-card-name">{location.fullName}</h4>
                    <p className="friend-card-distance">
                      {calculateDistance(
                        myLocation?.latitude || 0,
                        myLocation?.longitude || 0,
                        location.latitude,
                        location.longitude
                      )} away
                    </p>
                    {location.batteryLevel && (
                      <div className="friend-card-battery">
                        <BatteryCharging className="battery-icon" size={12} />
                        <span>{location.batteryLevel}%</span>
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
          .v2-location-container {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #f5f5f5;
          }

          .map-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
          }

          .v2-map {
            width: 100%;
            height: 100%;
          }

          /* Bottom Sheet */
          .location-bottom-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2500; /* Higher than nav button (2000) */
            background: linear-gradient(to top, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.9) 100%);
            backdrop-filter: blur(30px);
            border-top-left-radius: 24px;
            border-top-right-radius: 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            touch-action: none;
          }

          /* Drag Handle */
          .sheet-drag-handle {
            height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: grab;
            touch-action: none;
            user-select: none;
            padding: 0 16px;
          }

          .sheet-drag-handle:active {
            cursor: grabbing;
          }

          .drag-indicator {
            width: 40px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            margin-bottom: 8px;
            transition: background 0.2s ease;
          }

          .sheet-drag-handle:hover .drag-indicator {
            background: rgba(255, 255, 255, 0.5);
          }

          .sheet-drag-handle:active .drag-indicator {
            background: rgba(255, 255, 255, 0.7);
          }

          /* Initial bounce animation hint */
          @keyframes bounce-hint {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
            }
          }

          .sheet-drag-handle {
            animation: bounce-hint 2s ease-in-out 3;
          }

          .sheet-preview {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 4px 0;
          }

          .sheet-preview-info {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .sheet-icon {
            width: 20px;
            height: 20px;
            color: rgba(255, 255, 255, 0.7);
          }

          .sheet-count {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.8);
          }

          .sheet-chevron-icon {
            width: 20px;
            height: 20px;
            color: rgba(255, 255, 255, 0.6);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .sheet-chevron-rotated {
            transform: rotate(180deg);
          }

          /* Sheet Content */
          .sheet-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0 16px 16px;
            -webkit-overflow-scrolling: touch;
          }

          .sheet-content::-webkit-scrollbar {
            display: none;
          }

          .cards-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .cards-title {
            font-size: 16px;
            font-weight: 600;
            color: white;
            margin: 0;
          }

          .cards-count {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
          }

          .friends-scroll {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
          }

          .friends-scroll::-webkit-scrollbar {
            display: none;
          }

          .friend-card {
            flex-shrink: 0;
            width: 140px;
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 12px;
            border: 1px solid rgba(255,255,255,0.1);
          }

          .friend-card-avatar {
            position: relative;
            width: 48px;
            height: 48px;
            margin: 0 auto 8px;
          }

          .friend-card-image,
          .friend-card-placeholder {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
          }

          .friend-card-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
            color: white;
            font-weight: 600;
          }

          .friend-status {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid rgba(0,0,0,0.5);
          }

          .friend-status.online {
            background: #22c55e;
          }

          .friend-card-info {
            text-align: center;
          }

          .friend-card-name {
            font-size: 14px;
            font-weight: 600;
            color: white;
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .friend-card-distance {
            font-size: 11px;
            color: rgba(255,255,255,0.6);
            margin: 0 0 4px 0;
          }

          .friend-card-battery {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 10px;
            color: rgba(255,255,255,0.5);
          }

          .battery-icon {
            color: #22c55e;
          }

          .empty-state {
            width: 100%;
            text-align: center;
            padding: 24px;
          }

          .empty-icon {
            width: 48px;
            height: 48px;
            color: rgba(255,255,255,0.3);
            margin: 0 auto 12px;
          }

          .empty-text {
            font-size: 14px;
            color: white;
            margin: 0 0 4px 0;
          }

          .empty-subtext {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            margin: 0;
          }

          /* Current user pulse animation */
          .current-user-pulse {
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border-radius: 50%;
            position: relative;
            animation: pulse 2s infinite;
          }

          .current-user-pulse::before,
          .current-user-pulse::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: rgba(59, 130, 246, 0.5);
            animation: pulse-ring 2s infinite;
          }

          .current-user-pulse::after {
            animation-delay: 0.5s;
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }

          @keyframes pulse-ring {
            0% {
              width: 20px;
              height: 20px;
              opacity: 1;
            }
            100% {
              width: 60px;
              height: 60px;
              opacity: 0;
            }
          }

          /* Custom marker styles */
          .custom-marker {
            position: relative;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .marker-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 2;
          }

          .marker-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .marker-avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(102, 126, 234, 0.8);
            color: white;
            font-weight: 600;
            font-size: 14px;
          }

          .marker-pulse {
            position: absolute;
            width: 48px;
            height: 48px;
            background: rgba(102, 126, 234, 0.3);
            border-radius: 50%;
            animation: marker-pulse 2s infinite;
          }

          @keyframes marker-pulse {
            0% {
              transform: scale(0.8);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.3;
            }
            100% {
              transform: scale(0.8);
              opacity: 0.8;
            }
          }
        `}</style>
      </div>
    </SignalRProvider>
  );
}

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
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
}