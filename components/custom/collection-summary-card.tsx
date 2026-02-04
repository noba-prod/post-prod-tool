"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CollectionStatusTag } from "./tag"
import { Separator } from "@/components/ui/separator"

interface CollectionSummaryCardProps {
  /** Collection name (e.g., "Kids Summer'25") */
  name: string
  /** Collection status (design system CollectionStatusTag: draft, upcoming, in-progress, completed, canceled) */
  status?: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
  /** Client name */
  client?: string
  /** Publishing date (formatted for display). Optional — collection can be created without it. */
  publishingDate?: string
  /** Last update timestamp (ISO string) — shown as relative time */
  lastUpdate?: string
  className?: string
}

function formatRelativeLastUpdate(isoOrLabel: string): string {
  const date = new Date(isoOrLabel)
  if (Number.isNaN(date.getTime())) return isoOrLabel
  const now = Date.now()
  const diffMs = now - date.getTime()
  if (diffMs < 0) return isoOrLabel
  const minutes = Math.floor(diffMs / 60_000)
  const hours = diffMs / 3_600_000
  const days = diffMs / 86_400_000
  const weeks = diffMs / (7 * 86_400_000)
  const months = diffMs / (30.44 * 86_400_000)
  const years = diffMs / (365.25 * 86_400_000)
  if (minutes < 60) {
    const x = minutes < 1 ? 0 : minutes
    return x === 1 ? "1 minute ago" : `${x} minutes ago`
  }
  if (hours < 24) {
    const x = Math.round(hours)
    return x === 1 ? "1 hour ago" : `${x} hours ago`
  }
  if (days < 7) {
    const x = Math.round(days)
    return x === 1 ? "1 day ago" : `${x} days ago`
  }
  if (weeks < 4) {
    const x = Math.round(weeks)
    return x === 1 ? "1 week ago" : `${x} weeks ago`
  }
  if (months < 12) {
    const x = Math.round(months)
    return x === 1 ? "1 month ago" : `${x} months ago`
  }
  const x = Math.round(years)
  return x === 1 ? "1 year ago" : `${x} years ago`
}

/**
 * Collection Summary Card component
 * Displays a summary of a collection with name, status badge, client, deadline, and last update
 */
export function CollectionSummaryCard({
  name,
  status = "draft",
  client = "Zara",
  publishingDate,
  lastUpdate,
  className,
}: CollectionSummaryCardProps) {
  const lastUpdateLabel =
    lastUpdate == null || lastUpdate === ""
      ? "—"
      : /^\d{4}-\d{2}-\d{2}T/.test(lastUpdate)
        ? formatRelativeLastUpdate(lastUpdate)
        : lastUpdate

  return (
    <div
      className={cn(
        "bg-white border border-zinc-200 rounded-xl p-4 w-full",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Name + Status Badge */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-zinc-900 truncate min-w-0">{name}</h3>
          <CollectionStatusTag type="default" status={status} className="shrink-0" />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium w-full">
            <span className="text-zinc-500">Client</span>
            <span className="text-zinc-900">{client}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium w-full">
            <span className="text-zinc-500">Publishing date</span>
            <span className="text-zinc-900">{publishingDate ?? "—"}</span>
          </div>
        </div>

        <Separator />

        {/* Last Update — label left, value right (justified) */}
        <div className="flex items-center justify-between text-xs font-medium w-full">
          <span className="text-zinc-500">Last update</span>
          <span className="text-zinc-900">{lastUpdateLabel}</span>
        </div>
      </div>
    </div>
  )
}
