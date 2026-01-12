"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface CollectionSummaryCardProps {
  /** Collection name (e.g., "Kids Summer'25") */
  name: string
  /** Collection status badge (e.g., "draft", "upcoming", "in-progress") */
  status?: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
  /** Client name */
  client?: string
  /** Deadline date */
  deadline?: string
  /** Last update timestamp */
  lastUpdate?: string
  className?: string
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500",
  upcoming: "bg-blue-50 text-blue-600",
  "in-progress": "bg-amber-50 text-amber-600",
  completed: "bg-teal-50 text-teal-600",
  canceled: "bg-red-50 text-red-600",
}

/**
 * Collection Summary Card component
 * Displays a summary of a collection with name, status badge, client, deadline, and last update
 */
export function CollectionSummaryCard({
  name,
  status = "draft",
  client = "Zara",
  deadline = "Dec 14, 2025",
  lastUpdate = "5 minutes ago",
  className,
}: CollectionSummaryCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-zinc-200 rounded-xl p-4 w-full",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Name + Status Badge */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">{name}</h3>
          <Badge 
            variant="secondary" 
            className={cn("text-xs font-medium", statusColors[status])}
          >
            {status}
          </Badge>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-500">Client</span>
            <span className="text-zinc-900">{client}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-500">Deadline</span>
            <span className="text-zinc-900">{deadline}</span>
          </div>
        </div>

        <Separator />

        {/* Last Update */}
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-zinc-500">Last update:</span>
          <span className="text-zinc-900">{lastUpdate}</span>
        </div>
      </div>
    </div>
  )
}
