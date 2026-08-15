import { useEffect, useState } from "react";
import { appHub } from "@/lib/signalr/app-hub";

export interface Moment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  createdAt: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
  visibility?: string;
}

export function useMoments() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to real-time moment updates via SignalR
    const unsubscribeReaction = appHub.onReceiveMomentReacted((data: any) => {
      // Handle moment reactions
      console.log('Moment reacted:', data);
    });

    return () => {
      unsubscribeReaction();
    };
  }, []);

  const getMoments = async (): Promise<Moment[]> => {
    try {
      setIsLoading(true);
      // Use existing moment service
      const response = await fetch('/api/moments');
      const data = await response.json();
      setMoments(data);
      return data;
    } catch (error) {
      console.error('Failed to get moments:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getUserMoments = async (userId: string): Promise<Moment[]> => {
    try {
      const response = await fetch(`/api/moments/user/${userId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get user moments:', error);
      return [];
    }
  };

  const createMoment = async (formData: FormData): Promise<Moment> => {
    try {
      const response = await fetch('/api/moments', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to create moment');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create moment:', error);
      throw error;
    }
  };

  const deleteMoment = async (momentId: string) => {
    try {
      await fetch(`/api/moments/${momentId}`, {
        method: 'DELETE'
      });
      
      // Update local state
      setMoments(prev => prev.filter(m => m.id !== momentId));
    } catch (error) {
      console.error('Failed to delete moment:', error);
      throw error;
    }
  };

  const likeMoment = async (momentId: string): Promise<void> => {
    try {
      await fetch(`/api/moments/${momentId}/like`, {
        method: 'POST'
      });
      
      // Optimistic update
      setMoments(prev => prev.map(m => {
        if (m.id === momentId) {
          return {
            ...m,
            likes: (m.likes || 0) + (m.isLiked ? -1 : 1),
            isLiked: !m.isLiked
          };
        }
        return m;
      }));
    } catch (error) {
      console.error('Failed to like moment:', error);
      throw error;
    }
  };

  const commentOnMoment = async (momentId: string, content: string) => {
    try {
      const response = await fetch(`/api/moments/${momentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const data = await response.json();
      
      // Update comment count
      setMoments(prev => prev.map(m => 
        m.id === momentId ? { ...m, comments: (m.comments || 0) + 1 } : m
      ));
      
      return data;
    } catch (error) {
      console.error('Failed to comment on moment:', error);
      throw error;
    }
  };

  return {
    moments,
    isLoading,
    getMoments,
    getUserMoments,
    createMoment,
    deleteMoment,
    likeMoment,
    commentOnMoment
  };
}