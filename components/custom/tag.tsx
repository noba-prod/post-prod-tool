"use client"

import * as React from "react"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// COLLECTION STATUS TAG
// ============================================================================

type CollectionStatusType = "default" | "overlay"
type CollectionStatusValue = "draft" | "upcoming" | "in-progress" | "completed" | "canceled"

interface CollectionStatusTagProps {
  type?: CollectionStatusType
  status?: CollectionStatusValue
  className?: string
}

const collectionStatusStyles = {
  default: {
    draft: "bg-secondary text-muted-foreground",
    upcoming: "bg-primary text-primary-foreground",
    "in-progress": "bg-blue-50 text-blue-500",
    completed: "bg-teal-50 text-teal-500",
    canceled: "bg-red-50 text-red-600",
  },
  overlay: {
    draft: "backdrop-blur-xl bg-white/30 text-white/80",
    upcoming: "backdrop-blur-xl bg-white/30 text-white/80",
    "in-progress": "backdrop-blur-xl bg-white/30 text-white/80",
    completed: "backdrop-blur-xl bg-white/30 text-white/80",
    canceled: "backdrop-blur-xl bg-white/30 text-white/80",
  },
}

const collectionStatusLabels: Record<CollectionStatusValue, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  "in-progress": "In progress",
  completed: "Completed",
  canceled: "Canceled",
}

export function CollectionStatusTag({
  type = "default",
  status = "draft",
  className,
}: CollectionStatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-md whitespace-nowrap",
        collectionStatusStyles[type][status],
        className
      )}
    >
      {collectionStatusLabels[status]}
    </span>
  )
}

// ============================================================================
// STAGE STATUS TAG
// ============================================================================

type StageStatusValue = "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"

interface StageStatusTagProps {
  status?: StageStatusValue
  className?: string
}

const stageStatusStyles: Record<StageStatusValue, string> = {
  upcoming: "bg-primary text-primary-foreground",
  "in-progress": "bg-blue-50 text-blue-500",
  "in-transit": "bg-blue-50 text-blue-500",
  done: "bg-teal-50 text-teal-500",
  delivered: "bg-teal-50 text-teal-500",
}

const stageStatusLabels: Record<StageStatusValue, string> = {
  upcoming: "Upcoming",
  "in-progress": "In progress",
  "in-transit": "In transit",
  done: "Done",
  delivered: "Delivered",
}

export function StageStatusTag({
  status = "upcoming",
  className,
}: StageStatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-1 text-sm font-semibold rounded-lg whitespace-nowrap",
        stageStatusStyles[status],
        className
      )}
    >
      {stageStatusLabels[status]}
    </span>
  )
}

// ============================================================================
// DATE INDICATOR TAG
// ============================================================================

interface DateIndicatorTagProps {
  label?: string
  date?: string
  time?: string
  className?: string
}

export function DateIndicatorTag({
  label = "Deadline:",
  date = "Dec 6, 2025",
  time = "End of day (5:00pm)",
  className,
}: DateIndicatorTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold rounded-lg bg-sidebar whitespace-nowrap",
        className
      )}
    >
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground">{date}</span>
      <span className="text-muted-foreground/30">·</span>
      <span className="text-muted-foreground">{time}</span>
    </span>
  )
}

// ============================================================================
// TIME STAMP TAG
// ============================================================================

type TimeStampValue = "on-track" | "on-time" | "delayed" | "at-risk"

interface TimeStampTagProps {
  status?: TimeStampValue
  className?: string
}

const timeStampStyles: Record<TimeStampValue, string> = {
  "on-track": "bg-teal-50 text-teal-500",
  "on-time": "bg-teal-50 text-teal-500",
  delayed: "bg-red-50 text-red-600",
  "at-risk": "bg-amber-50 text-amber-500",
}

const timeStampLabels: Record<TimeStampValue, string> = {
  "on-track": "On track",
  "on-time": "On time",
  delayed: "Delayed",
  "at-risk": "At risk",
}

export function TimeStampTag({
  status = "on-track",
  className,
}: TimeStampTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-1 text-sm font-semibold rounded-lg whitespace-nowrap",
        timeStampStyles[status],
        className
      )}
    >
      {timeStampLabels[status]}
    </span>
  )
}

// ============================================================================
// COLLECTION PROGRESS TAG
// ============================================================================

interface CollectionProgressTagProps {
  /** Porcentaje de progreso (0-100) */
  progress?: number
  className?: string
}

function ProgressCircle({ progress }: { progress: number }) {
  const size = 14
  const strokeWidth = 1.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
    >
      {/* Círculo de fondo */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/20"
      />
      {/* Círculo de progreso */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-foreground"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
        }}
      />
    </svg>
  )
}

export function CollectionProgressTag({
  progress = 0,
  className,
}: CollectionProgressTagProps) {
  // Clamp progress entre 0 y 100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 pl-1 pr-1.5 py-1 text-sm font-semibold rounded-md bg-sidebar-accent text-foreground whitespace-nowrap",
        className
      )}
    >
      <span className="p-0.5">
        <ProgressCircle progress={clampedProgress} />
      </span>
      <span>{clampedProgress}%</span>
    </span>
  )
}

// ============================================================================
// PHOTOGRAPHER NAME TAG
// ============================================================================

interface PhotographerNameTagProps {
  /** Nombre del fotógrafo */
  name?: string
  className?: string
}

export function PhotographerNameTag({
  name = "Photographer Name",
  className,
}: PhotographerNameTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-sm font-semibold rounded-lg bg-sidebar-accent text-foreground whitespace-nowrap",
        className
      )}
    >
      <Camera className="size-4 shrink-0" />
      <span>{name}</span>
    </span>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  CollectionStatusTagProps,
  StageStatusTagProps,
  DateIndicatorTagProps,
  TimeStampTagProps,
  CollectionProgressTagProps,
  PhotographerNameTagProps,
}

