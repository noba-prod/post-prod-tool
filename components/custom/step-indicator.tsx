"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepIndicatorProps {
  /** The status of the step indicator */
  status?: "active" | "disabled" | "completed"
  /** Color variant - defaults to black (base), can be overridden for context-specific colors */
  color?: "default" | "teal" | "muted"
  className?: string
}

/**
 * Base Step Indicator component with three visual states:
 * - active: Circle with border and filled dot in center
 * - disabled: Empty circle with border only
 * - completed: Filled circle with check icon
 * 
 * Base component uses black (zinc-900) for all states.
 * Use `color` prop to apply semantic colors in context (e.g., teal for success).
 */
export function StepIndicator({ status = "disabled", color = "default", className }: StepIndicatorProps) {
  // Determine colors based on color prop
  const colors = {
    default: {
      fill: "bg-zinc-900",
      border: "border-zinc-900",
      text: "text-white",
    },
    teal: {
      fill: "bg-teal-500",
      border: "border-teal-500",
      text: "text-white",
    },
    muted: {
      fill: "bg-zinc-500",
      border: "border-zinc-500",
      text: "text-white",
    },
  }

  const colorSet = colors[color]

  if (status === "completed") {
    return (
      <div
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-full shrink-0",
          colorSet.fill,
          className
        )}
      >
        <Check className={cn("w-2.5 h-2.5", colorSet.text)} strokeWidth={3} />
      </div>
    )
  }

  if (status === "active") {
    return (
      <div
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-full shrink-0 border-[1.5px]",
          colorSet.border,
          className
        )}
      >
        <div className={cn("w-2 h-2 rounded-full", colorSet.fill)} />
      </div>
    )
  }

  // disabled - empty circle with border only
  return (
    <div
      className={cn(
        "w-4 h-4 rounded-full shrink-0 border-[1.5px]",
        colorSet.border,
        className
      )}
    />
  )
}
