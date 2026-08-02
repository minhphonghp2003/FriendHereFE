import type { MomentDto } from "@/types/moment";
import type { FileDto } from "@/types/upload";

export const applyFileMarkedSuccess = (moments: MomentDto[], file: FileDto): MomentDto[] =>
  moments.map((m) => {
    if (m.status !== "Processing") return m;

    let images = m.images;
    let video = m.video;

    if (!video && images.length === 0) {
      images = [{ originalUrl: file.originalUrl, thumbUrl: file.thumbUrl }];
    } else if (video && !video.thumbUrl) {
      video = { ...video, thumbUrl: file.thumbUrl };
    }

    return { ...m, status: "Success", images, video };
  });
