"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { VerticalProgressIndicator } from "./vertical-progress-indicator"
import { CollectionStepSummary } from "./collection-step-summary"
import { Button } from "@/components/ui/button"

export type CollectionStepperStatus = "locked" | "active" | "completed"

interface CollectionStepperProps {
  /** locked | active | completed – drives Vertical Progress Indicator and Step Summary variants */
  status?: CollectionStepperStatus
  /** Step title (e.g. "Shooting", "Client Selection") */
  title?: string
  /** Stage status for summary tag when status is active/completed */
  stageStatus?: "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"
  /** Time stamp for summary tag when status is active/completed */
  timeStampStatus?: "on-track" | "on-time" | "delayed" | "at-risk"
  /** Deadline label */
  deadlineLabel?: string
  /** Deadline date */
  deadlineDate?: string
  /** Deadline time */
  deadlineTime?: string
  /** Callback when step is clicked (e.g. to open step modal). Not used when status is locked. */
  onStepClick?: () => void
  /** Whether to show the expand/arrow button */
  showExpandButton?: boolean
  className?: string
}

/**
 * Collection Stepper: one row = Vertical Progress Indicator + Step Summary + optional arrow button.
 * Represents a phase of the collection; status locked | active | completed drives both base components.
 * Figma: Collection Stepper (node-id 13526-38821). Used to guide users through collection steps.
 */
export function CollectionStepper({
  status = "locked",
  title = "This is a title",
  stageStatus = "in-progress",
  timeStampStatus = "on-track",
  deadlineLabel = "Deadline:",
  deadlineDate = "Dec 4, 2025",
  deadlineTime = "End of day (5:00pm)",
  onStepClick,
  showExpandButton = true,
  className,
}: CollectionStepperProps) {
  const isLocked = status === "locked"

  return (
    <div
      className={cn(
        "flex items-stretch gap-8",
        !isLocked && onStepClick && "cursor-pointer",
        className
      )}
      onClick={!isLocked ? onStepClick : undefined}
      role={!isLocked && onStepClick ? "button" : undefined}
      tabIndex={!isLocked && onStepClick ? 0 : undefined}
      data-status={status}
    >
      <VerticalProgressIndicator status={status} segmentHeight={32} />
      {/* Figma layout8/layout16: Summary + CTA with gap 12px; 12px top/bottom padding */}
      <div className="flex items-stretch gap-3 flex-1 min-w-0 py-3">
        <CollectionStepSummary
          status={status}
          title={title}
          stageStatus={stageStatus}
          timeStampStatus={timeStampStatus}
          deadlineLabel={deadlineLabel}
          deadlineDate={deadlineDate}
          deadlineTime={deadlineTime}
          className="flex-1 min-w-0"
        />
        {showExpandButton && (
          <div className="shrink-0 w-10 self-stretch min-h-0 flex">
            <Button
              variant={status === "active" ? "default" : "secondary"}
              size="icon"
              className={cn(
                "!h-full !min-h-0 w-full rounded-xl",
                isLocked && "opacity-50 pointer-events-none"
              )}
              aria-label="Open step"
              onClick={(e) => {
                e.stopPropagation()
                if (!isLocked && onStepClick) onStepClick()
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
