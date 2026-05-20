"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toLoadingLabel } from "@/lib/ui/loading-labels"

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
  /** Primary button loading state (spinner + gerund) */
  primaryLoading?: boolean
  /** Override gerund text while primary is loading */
  primaryLoadingText?: string
  /** Secondary button disabled state */
  secondaryDisabled?: boolean
  /** Secondary button loading state */
  secondaryLoading?: boolean
  /** Override gerund text while secondary is loading */
  secondaryLoadingText?: string
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
  primaryLoading = false,
  primaryLoadingText,
  secondaryDisabled = false,
  secondaryLoading = false,
  secondaryLoadingText,
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
          loading={secondaryLoading}
          loadingText={secondaryLoadingText ?? toLoadingLabel(secondaryLabel)}
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
          loading={primaryLoading}
          loadingText={primaryLoadingText ?? toLoadingLabel(primaryLabel)}
          className="rounded-xl px-4"
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  )
}

export type { ActionBarProps }
