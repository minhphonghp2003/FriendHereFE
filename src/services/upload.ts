import { httpClient } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { PresignedUploadItem, PresignedUploadRequest } from "@/types/upload";

export async function getPresignedUploadUrls(
  request: PresignedUploadRequest
): Promise<PresignedUploadItem[]> {
  const { data } = await httpClient.post<ApiResponse<PresignedUploadItem[]>>(
    "/Upload/presigned-upload",
    request
  );
  return data.data;
}

export async function uploadToPresignedUrl(
  url: string,
  file: Blob,
  contentType: string
): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) {
    const message =
      res.status === 400
        ? "Yêu cầu tải lên không hợp lệ (400)"
        : res.status === 403
          ? "Content-Type không khớp hoặc URL đã hết hạn (403)"
          : res.status === 404
            ? "Không tìm thấy URL tải lên hoặc đã hết hạn (404)"
            : `Upload thất bại (HTTP ${res.status})`;
    throw new Error(message);
  }
}
