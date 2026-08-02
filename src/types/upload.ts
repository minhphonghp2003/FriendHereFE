export type StorageBucket = "Profile" | "Moment" | "Chat";

export interface PresignedUploadRequest {
  bucket: StorageBucket;
  contentTypes: string[];
}

export interface PresignedUploadItem {
  fileId: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
  expiresAt: string;
}
