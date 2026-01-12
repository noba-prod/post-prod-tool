"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface EntitySummaryCardProps {
  /** Entity name (e.g., "@zara") */
  name: string
  /** Entity type badge (e.g., "client") */
  type?: string
  /** Number of team members */
  teamMembers?: number
  /** Number of collections */
  collections?: number
  /** Last update timestamp */
  lastUpdate?: string
  className?: string
}

/**
 * Entity Summary Card component
 * Displays a summary of an entity with name, type badge, stats, and last update
 */
export function EntitySummaryCard({
  name,
  type = "client",
  teamMembers = 0,
  collections = 0,
  lastUpdate = "5 minutes ago",
  className,
}: EntitySummaryCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-zinc-200 rounded-xl p-4 w-full",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Header: Name + Type Badge */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">{name}</h3>
          <Badge variant="secondary" className="text-xs font-medium text-zinc-500">
            {type}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-500">Team members</span>
            <span className="text-zinc-900">{teamMembers}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-500">Collections</span>
            <span className="text-zinc-900">{collections}</span>
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
