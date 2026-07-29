import { useState } from "react";
import { createMoment } from "@/services/moment";
import type { MomentDto, CreateMomentInput } from "@/types/moment";

export const useCreateMoment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: CreateMomentInput): Promise<MomentDto> => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (input.caption) formData.append("caption", input.caption);
      if (input.visibility) formData.append("visibility", input.visibility);
      if (input.allowComment !== undefined) formData.append("allowComment", String(input.allowComment));
      if (input.isShowLocation !== undefined) formData.append("isShowLocation", String(input.isShowLocation));
      if (input.excludedUserIds) formData.append("excludedUserIds", input.excludedUserIds);
      if (input.images) {
        input.images.forEach((file) => formData.append("images", file));
      }
      const data = await createMoment(formData);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create moment"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};