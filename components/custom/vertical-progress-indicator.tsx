"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StepIndicator } from "./step-indicator"

export type VerticalProgressIndicatorStatus = "locked" | "active" | "completed"

interface VerticalProgressIndicatorProps {
  /** locked | active | completed – maps to Default / Active / Completed in Figma */
  status?: VerticalProgressIndicatorStatus
  /** Height of each track segment (top and bottom). Default 32 (8rem equivalent via h-8). */
  segmentHeight?: number
  /** When true, hide the top segment (e.g. first step in list). */
  hideTopSegment?: boolean
  /** When true, hide the bottom segment (e.g. last step in list). */
  hideBottomSegment?: boolean
  className?: string
}

/**
 * Vertical progress indicator: top track + step indicator + bottom track.
 * Reuses StepIndicator; track fill reflects status (locked=empty, active=top full + bottom partial, completed=both full).
 * Figma: Vertical Progress Indicator (node-id 13444-5784), variants Default / Active / Completed.
 */
export function VerticalProgressIndicator({
  status = "locked",
  segmentHeight = 32,
  hideTopSegment = false,
  hideBottomSegment = false,
  className,
}: VerticalProgressIndicatorProps) {
  const isLocked = status === "locked"
  const isActive = status === "active"
  const isCompleted = status === "completed"

  const stepStatus: "active" | "disabled" | "completed" =
    isCompleted ? "completed" : isActive ? "active" : "disabled"
  // Figma: active and completed use black (fill2 #18181b). Use default black for StepIndicator.
  const stepColor = isLocked ? "muted" : "default"

  const topFillPercent = isLocked ? 0 : 100
  const bottomFillPercent = isCompleted ? 100 : isActive ? 25 : 0

  const trackClass = "w-0.5 min-w-[2px] bg-zinc-200 rounded-full overflow-hidden flex flex-col"
  // Figma: progress fill is black (fill2 #18181b), not green
  const fillClass = "bg-zinc-900 shrink-0 transition-all ease-out"

  return (
    <div
      className={cn("flex flex-col items-center shrink-0", className)}
      data-status={status}
    >
      {/* Top segment – hidden for first step so it reads as start of process */}
      <div
        className={cn(trackClass, "flex-1 min-h-0", hideTopSegment && "opacity-0")}
        style={{ height: segmentHeight }}
      >
        <div
          className={cn(fillClass, "w-full")}
          style={{ height: `${topFillPercent}%`, minHeight: topFillPercent ? 2 : 0 }}
        />
      </div>

      <StepIndicator status={stepStatus} color={stepColor} />

      {/* Bottom segment – hidden for last step so it reads as end of process */}
      <div
        className={cn(trackClass, "flex-1 min-h-0", hideBottomSegment && "opacity-0")}
        style={{ height: segmentHeight }}
      >
        <div
          className={cn(fillClass, "w-full")}
          style={{ height: `${bottomFillPercent}%`, minHeight: bottomFillPercent ? 2 : 0 }}
        />
      </div>
    </div>
  )
}
