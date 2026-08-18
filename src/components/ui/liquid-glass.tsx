"use client";

import { ReactNode } from "react";

interface LiquidGlassProps {
  children: ReactNode;
  /** Additional className */
  className?: string;
  /** Glass effect intensity */
  intensity?: "low" | "medium" | "high";
  /** Style overrides */
  style?: React.CSSProperties;
}

/**
 * Custom liquid glass container — a frosted glass surface with:
 * - backdrop blur over the content behind it
 * - subtle aqua gradient tint (brand color #7DDED0)
 * - glass-like border and inner highlight
 * - animated specular shimmer (pure CSS, GPU friendly)
 *
 * Intensity variants:
 * - low:    barely-there frost (chips, small badges)
 * - medium: standard modal glass
 * - high:   prominent frosted panel (header, fullscreen sheets)
 */
export function LiquidGlass({
  children,
  className = "",
  intensity = "medium",
  style,
}: LiquidGlassProps) {
  return (
    <div className={`lg-root lg-${intensity} ${className}`} style={style}>
      {/* Specular highlight layer (top edge shine, like real glass) */}
      <span className="lg-specular" aria-hidden />
      {/* Slow-moving shimmer sweep */}
      <span className="lg-shimmer" aria-hidden />
      {/* Content sits above the effect layers */}
      <div className="lg-content">{children}</div>
    </div>
  );
}
