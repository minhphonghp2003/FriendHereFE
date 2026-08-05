import type { ImageDto } from "./user";

export interface TimelinePartnerDto {
  userId: number;
  userName: string;
  userImage: ImageDto | null;
}

export interface TimelineDto {
  id: number;
  caption: string;
  ownerId: number;
  momentCount: number;
  partners: TimelinePartnerDto[];
  createdAt: string;
}

export interface CreateTimelineInput {
  caption: string;
  partnerIds: number[];
  momentIds: number[];
}
