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
  /** Callback when step is clicked (e.g. to open step modal). All steps (active, locked, completed) are clickable when this is set, except inactive. */
  onStepClick?: () => void
  /**
   * When true, the row cannot open the step modal (e.g. collection canceled). Active steps render as
   * locked visually so nothing looks “current”; distinct from `inactive` (scenario-hidden / greyed).
   */
  suppressInteraction?: boolean
  /** Whether to show the expand/arrow button */
  showExpandButton?: boolean
  /** When true, step is not part of this collection type (greyed out, not clickable). */
  inactive?: boolean
  /** When true, step is first in list – top progress segment is hidden. */
  isFirst?: boolean
  /** When true, step is last in list – bottom progress segment is hidden. */
  isLast?: boolean
  /** Shows unread activity marker for completed variant. */
  showAttentionDot?: boolean
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
  inactive = false,
  suppressInteraction = false,
  isFirst = false,
  isLast = false,
  showAttentionDot = false,
  className,
}: CollectionStepperProps) {
  const openDisabled = inactive || suppressInteraction
  const clickable = !openDisabled && !!onStepClick
  const isDisabled = inactive || suppressInteraction
  /** Read-only canceled collection: “active” must not look like the current step. */
  const uiStatus: CollectionStepperStatus =
    inactive || (suppressInteraction && status === "active") ? "locked" : status

  return (
    <div
      className={cn(
        "flex items-stretch gap-3 min-[760px]:gap-8",
        clickable && "cursor-pointer",
        inactive && "opacity-50 pointer-events-none",
        suppressInteraction &&
          !inactive &&
          "pointer-events-none cursor-default",
        className
      )}
      onClick={clickable ? () => onStepClick?.() : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      data-status={uiStatus}
      data-inactive={inactive || undefined}
    >
      <VerticalProgressIndicator
        status={uiStatus}
        segmentHeight={32}
        hideTopSegment={isFirst}
        hideBottomSegment={isLast}
      />
      {/* Figma layout8/layout16: Summary + CTA with gap 12px; 12px top/bottom padding */}
      <div className="flex items-stretch gap-3 flex-1 min-w-0 py-3">
        <div className="flex flex-1 min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <CollectionStepSummary
              status={uiStatus}
              title={title}
              stageStatus={stageStatus}
              timeStampStatus={timeStampStatus}
              deadlineLabel={deadlineLabel}
              deadlineDate={deadlineDate}
              deadlineTime={deadlineTime}
              showAttentionDot={showAttentionDot}
              className="flex-1 min-w-0"
            />
          </div>
        </div>
        {showExpandButton && (
          <div className="shrink-0 w-10 self-stretch min-h-0 flex">
            <Button
              variant={uiStatus === "active" && !inactive ? "default" : "secondary"}
              size="icon"
              className={cn(
                "!h-full !min-h-0 w-full rounded-xl",
                isDisabled && "opacity-50 pointer-events-none"
              )}
              aria-label="Open step"
              onClick={(e) => {
                e.stopPropagation()
                if (clickable) onStepClick?.()
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
