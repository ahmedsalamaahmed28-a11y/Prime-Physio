"use client"

import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: number
  color?: string
  className?: string
}

export function Loader({ size = 24, color, className }: LoaderProps) {
  const height = Math.round(size * 31.25 / 50)

  return (
    <svg
      className={cn("loader-svg", className)}
      x="0px" y="0px"
      viewBox="0 0 50 31.25"
      height={height}
      width={size}
      preserveAspectRatio="xMidYMid meet"
      color={color}
    >
      <path className="loader-track" strokeWidth="4" fill="none" pathLength="100"
        d="M0.625 21.5 h10.25 l3.75 -5.875 l7.375 15 l9.75 -30 l7.375 20.875 v0 h10.25"
      />
      <path className="loader-car" strokeWidth="4" fill="none" pathLength="100"
        d="M0.625 21.5 h10.25 l3.75 -5.875 l7.375 15 l9.75 -30 l7.375 20.875 v0 h10.25"
      />
    </svg>
  )
}
