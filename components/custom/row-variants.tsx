"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type RowVariant = "1" | "2" | "3"

interface RowVariantsProps {
  /** Number of columns/slots (1, 2, or 3) */
  variant?: RowVariant
  /** Content to render in the slots */
  children?: React.ReactNode
  /** Additional class names */
  className?: string
}

/**
 * Row Variants component - Layout wrapper with 1, 2, or 3 column grid
 * 
 * A flexible grid layout for form items and other components.
 * - variant="1": Single column (full width)
 * - variant="2": Two equal columns
 * - variant="3": Three equal columns
 * 
 * Gap: 16px (spacing-4) between columns
 */
export function RowVariants({
  variant = "1",
  children,
  className,
}: RowVariantsProps) {
  return (
    <div
      className={cn(
        "grid w-full gap-4",
        variant === "1" && "grid-cols-1",
        variant === "2" && "grid-cols-2",
        variant === "3" && "grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Slot placeholder component - Visual placeholder for empty slots
 * Used for demonstration purposes in the previewer
 */
export function SlotPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center p-6 rounded-md",
        "bg-purple-500/10 border border-dashed border-purple-500/50",
        "text-sm text-foreground text-center",
        className
      )}
    >
      Slot (swap it with your content)
    </div>
  )
}
