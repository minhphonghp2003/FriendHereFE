import { useState } from "react";
import { setAvatar } from "@/services/user";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import type { User } from "@/types/user";

const PROFILE_BUCKET = "Profile";

const resolveImageContentType = (file: File): string => {
  if (file.type && file.type.startsWith("image/")) return file.type;
  return "image/jpeg";
};

export const useUploadAvatar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (file: File): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const contentType = resolveImageContentType(file);
      const presigned = await getPresignedUploadUrls({
        bucket: PROFILE_BUCKET,
        contentTypes: [contentType],
      });
      const item = presigned[0];
      if (!item) throw new Error("Không lấy được URL tải lên");
      await uploadToPresignedUrl(item.uploadUrl, file, contentType);
      const data = await setAvatar(item.fileId);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to upload avatar"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
