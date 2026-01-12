"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

type BlockHeadingType = "active" | "disabled" | "view" | "default"

interface BlockHeadingProps {
  /** Variant type */
  type?: BlockHeadingType
  /** Title text */
  title?: string
  /** Subtitle text (only for active variant) */
  subtitle?: string
  /** Show subtitle (only for active variant) */
  showSubtitle?: boolean
  /** Show players/children (only for active variant) */
  showPlayers?: boolean
  /** Optional content below the heading (e.g., ParticipantSummary) - only for active */
  children?: React.ReactNode
  /** Callback when Edit button is clicked (for default variant) */
  onEdit?: () => void
  /** Callback when chevron is clicked (for view variant) */
  onExpand?: () => void
  /** Additional class name */
  className?: string
}

/**
 * Block Heading Component
 * 
 * Figma variants (node-id: 13394-3179):
 * - disabled: Form title (16px, muted) + disabled Edit button (opacity 50%)
 * - default: Form title (16px, black) + Edit button
 * - active: Block title (24px) + subtitle + children (ParticipantSummary)
 * - view: Form title (16px, black) + ChevronDown icon button
 */
export function BlockHeading({
  type = "active",
  title = "This is a title",
  subtitle = "This is a subtitle",
  showSubtitle = true,
  showPlayers = true,
  children,
  onEdit,
  onExpand,
  className,
}: BlockHeadingProps) {
  // Disabled variant: muted title (form, 16px) + disabled Edit button
  if (type === "disabled") {
    return (
      <div
        className={cn(
          "flex items-center justify-between h-6 w-full",
          className
        )}
      >
        {/* Title (form style, muted foreground) */}
        <div className="flex-1">
          <span className="text-base font-semibold text-muted-foreground">
            {title}
          </span>
        </div>

        {/* Disabled Edit button */}
        <Button
          variant="secondary"
          size="lg"
          disabled
          className="rounded-xl px-4 opacity-50"
        >
          Edit
        </Button>
      </div>
    )
  }

  // Default variant: Form title (16px, black) + Edit button (enabled)
  if (type === "default") {
    return (
      <div
        className={cn(
          "flex items-center justify-between h-6 w-full",
          className
        )}
      >
        {/* Title (form style, black) */}
        <div className="flex-1">
          <span className="text-base font-semibold text-foreground">
            {title}
          </span>
        </div>

        {/* Edit button */}
        <Button
          variant="secondary"
          size="lg"
          onClick={onEdit}
          className="rounded-xl px-4"
        >
          Edit
        </Button>
      </div>
    )
  }

  // View variant: Form title (16px, black) + ChevronDown icon button
  if (type === "view") {
    return (
      <div
        className={cn(
          "flex items-center justify-between h-6 w-full",
          className
        )}
      >
        {/* Title (form style, black) */}
        <div className="flex-1">
          <span className="text-base font-semibold text-foreground">
            {title}
          </span>
        </div>

        {/* ChevronDown icon button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onExpand}
          className="rounded-xl size-10"
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
    )
  }

  // Active variant: Block title (24px) + subtitle + children (ParticipantSummary)
  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      {/* Title (block style, 24px) */}
      <Titles
        type="block"
        title={title}
        subtitle={subtitle}
        showSubtitle={showSubtitle}
      />

      {/* Optional children (e.g., ParticipantSummary) */}
      {showPlayers && children}
    </div>
  )
}

export type { BlockHeadingProps, BlockHeadingType }
