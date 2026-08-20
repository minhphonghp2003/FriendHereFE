"use client";

import { cn } from "@/lib/utils";

interface LoadingVideoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24", 
  lg: "w-32 h-32",
};

export const LoadingVideo = ({ className, size = "md" }: LoadingVideoProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src="/images/logo.png"
        alt="Loading"
        className={cn(
          sizeClasses[size],
          "object-contain rounded-full animate-pulse-slow"
        )}
        style={{
          animation: "pulse-glow 2s ease-in-out infinite"
        }}
      />
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
            filter: drop-shadow(0 0 8px rgba(43, 176, 175, 0.4));
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
            filter: drop-shadow(0 0 20px rgba(43, 176, 175, 0.8));
          }
        }
      `}</style>
    </div>
  );
};
