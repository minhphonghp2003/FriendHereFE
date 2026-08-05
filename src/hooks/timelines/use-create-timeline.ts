import { useState } from "react";
import { createTimeline } from "@/services/timeline";
import type { CreateTimelineInput, TimelineDto } from "@/types/timeline";

export const useCreateTimeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: CreateTimelineInput): Promise<TimelineDto> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createTimeline(input);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create timeline"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
