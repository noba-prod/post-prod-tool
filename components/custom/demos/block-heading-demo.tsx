"use client"

import * as React from "react"
import { BlockHeading } from "../block-heading"
import { ParticipantSummary } from "../participant-summary"

/**
 * Demo for Block Heading component showing all 4 variants as in Figma
 */
export function BlockHeadingDemo() {
  return (
    <div className="flex flex-col gap-10 w-full max-w-4xl">
      {/* Disabled variant */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Disabled
        </p>
        <BlockHeading
          type="disabled"
          title="This is a title"
        />
      </div>

      {/* Default variant */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Default
        </p>
        <BlockHeading
          type="default"
          title="This is a title"
          onEdit={() => alert("Edit clicked!")}
        />
      </div>

      {/* Active variant with children */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Active (with ParticipantSummary)
        </p>
        <BlockHeading
          type="active"
          title="This is a title"
          subtitle="This is a subtitle"
        >
          <ParticipantSummary
            participants={[
              { role: "Client", name: "@zara" },
              { role: "Photographer", name: "@tomhaser" },
              { role: "Lab", name: "@revealcoruña" },
              { role: "Lab", name: "@revealcoruña" },
            ]}
          />
        </BlockHeading>
      </div>

      {/* View variant */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: View
        </p>
        <BlockHeading
          type="view"
          title="This is a title"
          onExpand={() => alert("Expand clicked!")}
        />
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Variants (from Figma):</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Disabled:</strong> Form title (16px, muted) + disabled Edit button (opacity 50%)</li>
          <li><strong>Default:</strong> Form title (16px, black) + Edit button</li>
          <li><strong>Active:</strong> Block title (24px) + subtitle + ParticipantSummary</li>
          <li><strong>View:</strong> Form title (16px, black) + ChevronDown icon button</li>
        </ul>
      </div>
    </div>
  )
}
