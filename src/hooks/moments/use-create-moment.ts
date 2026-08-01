import { useState } from "react";
import { createMoment } from "@/services/moment";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import type { MomentDto, CreateMomentInput } from "@/types/moment";

const MOMENT_BUCKET = "Moment";

const resolveContentType = (file: File): string => {
  if (file.type) return file.type;
  if (/\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name)) return "image/jpeg";
  if (/\.(mp4|webm|mov|m4v|avi)$/i.test(file.name)) return "video/mp4";
  return "application/octet-stream";
};

export const useCreateMoment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (input: CreateMomentInput): Promise<MomentDto> => {
    setIsLoading(true);
    setError(null);
    try {
      const files = input.images?.length ? input.images : input.video ? [input.video] : [];
      const contentTypes = files.map(resolveContentType);

      const presigned = await getPresignedUploadUrls({
        bucket: MOMENT_BUCKET,
        contentTypes,
      });

      await Promise.all(
        presigned.map((item, i) =>
          uploadToPresignedUrl(item.uploadUrl, files[i], contentTypes[i])
        )
      );

      const isVideo = input.video != null;
      const data = await createMoment({
        caption: input.caption,
        visibility: input.visibility,
        allowComment: input.allowComment,
        isShowLocation: input.isShowLocation,
        excludedUserIds: input.excludedUserIds ?? null,
        imageFileIds: isVideo ? null : presigned.map((item) => item.fileId),
        videoFileId: isVideo ? presigned[0]?.fileId ?? null : null,
      });
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
