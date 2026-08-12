import { useState } from "react";
import { changeGroupImage, getConversation } from "@/services/chat";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import type { ConversationDto } from "@/types/chat";

const GROUP_IMAGE_BUCKET = "Chat";

const resolveImageContentType = (file: File): string => {
  if (file.type && file.type.startsWith("image/")) return file.type;
  return "image/jpeg";
};

export const useUpdateGroupImage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (conversationId: number, file: File): Promise<ConversationDto> => {
    setIsLoading(true);
    setError(null);
    try {
      const contentType = resolveImageContentType(file);
      const presigned = await getPresignedUploadUrls({
        bucket: GROUP_IMAGE_BUCKET,
        contentTypes: [contentType],
      });
      const item = presigned[0];
      if (!item) throw new Error("Không lấy được URL tải lên");
      await uploadToPresignedUrl(item.uploadUrl, file, contentType);
      const res = await changeGroupImage(conversationId, item.fileId);
      if (!res.success) {
        throw new Error(res.message || "Không thể đổi ảnh nhóm");
      }
      const conv = await getConversation(conversationId);
      if (!conv.data) throw new Error("Không tải được thông tin nhóm");
      return conv.data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Không thể đổi ảnh nhóm"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};