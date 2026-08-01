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
    throw new Error(`Upload thất bại (HTTP ${res.status})`);
  }
}
