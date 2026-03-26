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

  const showDot = (isActive || isCompleted) && showAttentionDot

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
      {/* Below 760px: column — row1 title + dot; row2 tags. From 760px: single row as before. */}
      <div className="flex flex-1 min-w-0 flex-col gap-3 overflow-hidden min-[760px]:flex-row min-[760px]:items-center min-[760px]:gap-6">
        {/* Row 1: title + attention dot (inline below 760px); dot absolute only from 760px up */}
        <div className="flex min-w-0 items-center gap-2 min-[760px]:min-w-0 min-[760px]:flex-1">
          {showDot && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-rose-500 min-[760px]:hidden"
              aria-hidden="true"
            />
          )}
          <Titles
            type="form"
            title={title}
            showSubtitle={false}
            className={cn("min-w-0 flex-1", isLocked && "text-muted-foreground")}
          />
        </div>
        {/* Tags (or locked date): row 2 on narrow viewports; right side on wide */}
        {showTags && (
          <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-2 min-[760px]:w-auto min-[760px]:shrink-0 min-[760px]:justify-end min-[760px]:ml-auto">
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
          <div className="flex w-full items-start justify-start min-[760px]:w-auto min-[760px]:items-center min-[760px]:justify-end min-[760px]:shrink-0 min-[760px]:ml-auto">
            <DateIndicatorTag
              label={deadlineLabel}
              date={deadlineDate}
              time={deadlineTime}
              className="opacity-70 bg-zinc-100"
            />
          </div>
        )}
      </div>
      {showDot && (
        <span
          className="pointer-events-none absolute left-2 top-1/2 hidden size-1.5 -translate-y-1/2 rounded-full bg-rose-500 min-[760px]:block"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
