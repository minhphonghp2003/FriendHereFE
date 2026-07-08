import { useState, useEffect } from "react";
import { getUserById, getCurrentUser } from "@/services/user";
import type { User } from "@/types/user";

export const useUser = (id: number) => {
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      setData(null);
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
  }, [id]);

  return { data, isLoading, error };
};

export const useCurrentUser = () => {
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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
  }, []);

  return { data, isLoading, error };
};
