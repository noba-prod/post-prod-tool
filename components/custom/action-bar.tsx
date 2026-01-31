"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ActionBarProps {
  /** Primary action label */
  primaryLabel?: string
  /** Secondary action label */
  secondaryLabel?: string
  /** Show primary button */
  showPrimary?: boolean
  /** Show secondary button */
  showSecondary?: boolean
  /** Secondary button variant (default | destructive) */
  secondaryVariant?: "default" | "destructive"
  /** Primary button disabled state */
  primaryDisabled?: boolean
  /** Secondary button disabled state */
  secondaryDisabled?: boolean
  /** Callback when primary action is clicked */
  onPrimaryClick?: () => void
  /** Callback when secondary action is clicked */
  onSecondaryClick?: () => void
  /** Additional class name */
  className?: string
}

/**
 * Action Bar Component
 * 
 * A bar with primary and secondary action buttons aligned to the right.
 * Typically used at the bottom of forms or dialogs.
 * 
 * - Primary: Black filled button (default variant)
 * - Secondary: Outline button (secondary variant)
 * - Gap: 8px between buttons
 * - Button size: lg (40px height)
 * - Border radius: xl (12px)
 */
export function ActionBar({
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  showPrimary = true,
  showSecondary = true,
  secondaryVariant = "default",
  primaryDisabled = false,
  secondaryDisabled = false,
  onPrimaryClick,
  onSecondaryClick,
  className,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 w-full",
        className
      )}
    >
      {/* Secondary button */}
      {showSecondary && (
        <Button
          variant={secondaryVariant === "destructive" ? "destructive" : "secondary"}
          size="lg"
          onClick={onSecondaryClick}
          disabled={secondaryDisabled}
          className="rounded-xl px-4"
        >
          {secondaryLabel}
        </Button>
      )}

      {/* Primary button */}
      {showPrimary && (
        <Button
          variant="default"
          size="lg"
          onClick={onPrimaryClick}
          disabled={primaryDisabled}
          className="rounded-xl px-4"
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  )
}

export type { ActionBarProps }
