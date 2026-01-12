"use client"

import * as React from "react"
import { ParticipantSummary } from "../participant-summary"

/**
 * Demo for Participant Summary component
 */
export function ParticipantSummaryDemo() {
  const handleEditParticipants = () => {
    alert("Edit participants clicked!")
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      {/* Default with 4 participants */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Default (4 participants)
        </p>
        <ParticipantSummary
          participants={[
            { role: "Client", name: "@zara" },
            { role: "Photographer", name: "@tomhaser" },
            { role: "Lab", name: "@revealcoruña" },
            { role: "Lab", name: "@revealcoruña" },
          ]}
          onEditParticipants={handleEditParticipants}
        />
      </div>

      {/* With 3 participants */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          3 participants
        </p>
        <ParticipantSummary
          participants={[
            { role: "Client", name: "@mango" },
            { role: "Photographer", name: "@photoagency" },
            { role: "Editor", name: "@studiomadrid" },
          ]}
          onEditParticipants={handleEditParticipants}
        />
      </div>

      {/* With 2 participants */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          2 participants
        </p>
        <ParticipantSummary
          participants={[
            { role: "Client", name: "@dior" },
            { role: "Photographer", name: "@selfphoto" },
          ]}
          onEditParticipants={handleEditParticipants}
        />
      </div>

      {/* Without edit button */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Without edit button
        </p>
        <ParticipantSummary
          participants={[
            { role: "Client", name: "@loewe" },
            { role: "Photographer", name: "@snapshot" },
            { role: "Lab", name: "@kodaklab" },
          ]}
          showEditButton={false}
        />
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Figma tokens:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Background:</strong> sidebar-background (#fafafa) - no border</li>
          <li><strong>Border radius:</strong> xl (12px)</li>
          <li><strong>Padding:</strong> 16px horizontal, 12px vertical</li>
          <li><strong>Gap between players:</strong> 12px</li>
          <li><strong>Role text:</strong> 12px, medium, muted-foreground</li>
          <li><strong>Name:</strong> Badge (secondary variant)</li>
          <li><strong>Edit button:</strong> Underlined text link</li>
        </ul>
      </div>
    </div>
  )
}
