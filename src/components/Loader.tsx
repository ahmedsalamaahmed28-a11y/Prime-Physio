"use client";

import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Lightweight shimmer placeholder used in compact loading states
 * (for example, inside buttons and small inline actions).
 */
export function Loader({ size = 24, color, className }: LoaderProps) {
  const height = Math.max(8, Math.round(size * 31.25 / 50));

  return (
    <span
      role="presentation"
      aria-hidden="true"
      data-loader-color={color}
      className={cn("shimmer-skeleton inline-block shrink-0 rounded-md align-middle", className)}
      style={{ width: size, height }}
    />
  );
}
