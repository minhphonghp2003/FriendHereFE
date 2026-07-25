import { useState, useEffect, useCallback, useRef } from "react";
import { getUserById, getCurrentUser } from "@/services/user";
import type { User } from "@/types/user";

export const useUser = (id: number) => {
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevIdRef = useRef(id);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const idChanged = prevIdRef.current !== id;
    prevIdRef.current = id;

    if (!id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (idChanged) {
      setData(null);
    }

    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await getUserById(id);
        setData(user);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch user"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id, refreshKey]);

  return { data, isLoading, error, refetch };
};

export const useCurrentUser = (options?: { enabled?: boolean }) => {
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const user = await getCurrentUser();
        setData(user);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch current user"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [enabled]);

  return { data, isLoading, error };
};
