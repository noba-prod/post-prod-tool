"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import {
  StageStatusTag,
  TimeStampTag,
  DateIndicatorTag,
} from "./tag"

export type CollectionStepSummaryStatus = "locked" | "active" | "completed"

interface CollectionStepSummaryProps {
  /** locked | active | completed – Figma Property 1 (13526:38751) */
  status?: CollectionStepSummaryStatus
  /** Step title. Figma: Title instance, fill2 #18181b → text-foreground */
  title?: string
  /** Stage status for Tag 1 (Done / In progress). Only when status is active or completed. */
  stageStatus?: "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"
  /** Time stamp for Tag 2 (On track, etc.). Only when status is active or completed. */
  timeStampStatus?: "on-track" | "on-time" | "delayed" | "at-risk"
  /** Temporal reference – label. Figma: "Deadline:" */
  deadlineLabel?: string
  /** Temporal reference – date */
  deadlineDate?: string
  /** Temporal reference – time */
  deadlineTime?: string
  /** Forward-compat: when true, layout may switch to vertical when title truncates (optional). */
  switchToVerticalWhenTitleTruncates?: boolean
  /** Shows an unread activity red dot for active or completed steps (linked to notifications). */
  showAttentionDot?: boolean
  className?: string
}

/**
 * Collection Step Summary – 3 variants from Figma (node-id 13526-38751).
 * Uses Titles type="form" + div with 3 tags: StageStatusTag, TimeStampTag, DateIndicatorTag.
 * Colors aligned to design tokens: fill1=bg-white, fill2=foreground, fill5/fill9=zinc-50/100, stroke2=border, stroke3=Ring.
 */
export function CollectionStepSummary({
  status = "locked",
  title = "This is a title",
  stageStatus = "in-progress",
  timeStampStatus = "on-track",
  deadlineLabel = "Deadline:",
  deadlineDate = "Dec 4, 2025",
  deadlineTime = "End of day (5:00pm)",
  switchToVerticalWhenTitleTruncates,
  showAttentionDot = false,
  className,
}: CollectionStepSummaryProps) {
  const isLocked = status === "locked"
  const isActive = status === "active"
  const isCompleted = status === "completed"
  const showTags = isActive || isCompleted

  // Figma layout2: padding top/left/bottom 20px, right 12px → pt-5 pl-5 pb-5 pr-3
  const cardPadding = "pt-5 pl-5 pb-5 pr-3"
  // fill1 #ffffff, fill5 #fafafa (locked) → bg-white / bg-zinc-50; stroke2 → border (Figma 13526-38750)
  const cardBg = isLocked ? "bg-zinc-50" : "bg-white"
  const cardBorder = isLocked ? "border border-zinc-200" : "border border-border"

  return (
    <div
      className={cn(
        "relative rounded-xl flex items-stretch min-w-0",
        cardBg,
        cardBorder,
        cardPadding,
        isActive && "outline outline-2 outline-zinc-900 outline-offset-[2px]",
        className
      )}
      data-status={status}
    >
      {/* layout1: flex row, space_between, gap 24. Title left; tags always right, justified within container. */}
      <div className="flex flex-1 min-w-0 flex-row items-center gap-6 overflow-hidden">
        <Titles
          type="form"
          title={title}
          showSubtitle={false}
          className={cn("min-w-0", isLocked && "text-muted-foreground")}
        />
        {/* Tags block: always right-aligned, justified-end so tags stay inside and on the right. */}
        {showTags && (
          <div className="flex flex-row flex-wrap items-center justify-end gap-2 shrink-0 ml-auto">
            <StageStatusTag status={isCompleted ? "done" : stageStatus} />
            <TimeStampTag status={timeStampStatus} />
            <DateIndicatorTag
              label={deadlineLabel}
              date={deadlineDate}
              time={deadlineTime}
            />
          </div>
        )}
        {isLocked && (
          <div className="flex items-center justify-end shrink-0 ml-auto">
            <DateIndicatorTag
              label={deadlineLabel}
              date={deadlineDate}
              time={deadlineTime}
              className="opacity-70 bg-zinc-100"
            />
          </div>
        )}
      </div>
      {(isActive || isCompleted) && showAttentionDot && (
        <span
          className="pointer-events-none absolute left-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-rose-500"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
