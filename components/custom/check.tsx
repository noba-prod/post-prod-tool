"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CheckProps {
  /** Whether the check is active (checked) or inactive (unchecked) */
  status?: "active" | "inactive"
  /** Whether the check is disabled */
  disabled?: boolean
  className?: string
}

/**
 * Base Check component with two visual states: active and inactive.
 * Supports disabled state for both variants.
 */
export function Check({ status = "inactive", disabled = false, className }: CheckProps) {
  if (status === "active") {
    return (
      <div
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-[3px] shrink-0",
          disabled ? "bg-zinc-500" : "bg-zinc-900",
          className
        )}
      >
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 1L3.5 6.5L1 4"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "w-4 h-4 rounded-[3px] border-[1.5px] shrink-0",
        disabled ? "border-zinc-500" : "border-zinc-900",
        className
      )}
    />
  )
}
