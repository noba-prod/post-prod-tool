"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

interface ParticipantRole {
  /** Role type (e.g., "Client", "Photographer", "Lab") */
  role: string
  /** Entity/user name (e.g., "@zara", "@tomhaser") */
  name: string
}

interface ParticipantSummaryProps {
  /** List of participants with their roles */
  participants?: ParticipantRole[]
  /** Show edit participants button */
  showEditButton?: boolean
  /** Callback when edit participants is clicked */
  onEditParticipants?: () => void
  /** Additional class name */
  className?: string
}

// Sample data for demo
const sampleParticipants: ParticipantRole[] = [
  { role: "Client", name: "@zara" },
  { role: "Photographer", name: "@tomhaser" },
  { role: "Lab", name: "@revealcoruña" },
  { role: "Lab", name: "@revealcoruña" },
]

/**
 * Participant Summary Component
 * 
 * Displays a summary of participants involved in each phase.
 * Shows role label + badge with entity name, separated by vertical dividers.
 * Includes an "Edit participants" CTA button.
 * 
 * Figma tokens:
 * - Background: sidebar-background (#fafafa)
 * - No border
 * - Border radius: xl (12px)
 * - Padding: 16px horizontal, 12px vertical
 * - Gap between players: 12px
 */
export function ParticipantSummary({
  participants = sampleParticipants,
  showEditButton = true,
  onEditParticipants,
  className,
}: ParticipantSummaryProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 bg-sidebar rounded-xl w-full",
        className
      )}
    >
      {/* Participant chips */}
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {participants.map((participant, index) => (
          <React.Fragment key={`${participant.role}-${participant.name}-${index}`}>
            {/* Separator between items */}
            {index > 0 && (
              <Separator
                orientation="vertical"
                className="h-5"
              />
            )}
            {/* Participant chip: role + badge */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                {participant.role}
              </span>
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-semibold">
                {participant.name}
              </Badge>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Edit participants button */}
      {showEditButton && (
        <button
          type="button"
          onClick={onEditParticipants}
          className="text-sm font-medium text-foreground underline underline-offset-4 shrink-0 ml-3 hover:text-foreground/80"
        >
          Edit participants
        </button>
      )}
    </div>
  )
}

export type { ParticipantSummaryProps, ParticipantRole }
