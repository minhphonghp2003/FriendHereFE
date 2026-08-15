import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export interface UserLocation {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
  batteryLevel?: number;
  isCharging?: boolean;
  status?: string;
  lastUpdate: string;
}

export function useLocations() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [myLocation, setMyLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLocations();
    
    // Set up polling for location updates (simplified approach)
    const interval = setInterval(loadLocations, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      // This will use the existing location service
      const response = await fetch('/api/location/active-users');
      const data = await response.json();
      setLocations(data);
      
      // Get current user location
      const currentLocation = await fetch('/api/location/my-location');
      if (currentLocation.ok) {
        const myData = await currentLocation.json();
        setMyLocation(myData);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMyLocation = async (latitude: number, longitude: number) => {
    try {
      await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const updateVisibility = async (visibility: string) => {
    try {
      await fetch('/api/location/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility })
      });
    } catch (error) {
      console.error('Failed to update visibility:', error);
    }
  };

  return {
    locations,
    myLocation,
    isLoading,
    updateMyLocation,
    updateVisibility,
    refresh: loadLocations
  };
}