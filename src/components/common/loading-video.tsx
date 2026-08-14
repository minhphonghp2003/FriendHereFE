import { cn } from "@/lib/utils";

interface LoadingVideoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "size-24",
  md: "size-40",
  lg: "size-64",
};

export const LoadingVideo = ({ className, size = "md" }: LoadingVideoProps) => {
  return (
    <video
      className={cn(sizeClasses[size], "object-contain", className)}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      preload="auto"
      role="status"
      aria-label="Loading"
    >
      <source src="/loading.mp4" type="video/mp4" />
      <source src="/loading.webm" type="video/webm" />
    </video>
  );
};
