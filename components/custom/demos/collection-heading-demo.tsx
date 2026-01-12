"use client"

import * as React from "react"
import { CollectionHeading } from "../collection-heading"

/**
 * Demo for Collection Heading component showing both variants
 */
export function CollectionHeadingDemo() {
  return (
    <div className="flex flex-col gap-10 w-full max-w-4xl">
      {/* Main variant */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Main
        </p>
        <CollectionHeading
          type="main"
          collectionName="Kids Summer'25"
          clientName="@zara"
          progress={0}
          stageStatus="upcoming"
          onParticipants={() => alert("Participants clicked!")}
          onSettings={() => alert("Settings clicked!")}
        />
      </div>

      {/* Main variant - different status */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Main (in-progress, 65%)
        </p>
        <CollectionHeading
          type="main"
          collectionName="Beach Resort 2025"
          clientName="@mango"
          progress={65}
          stageStatus="in-progress"
        />
      </div>

      {/* Stage variant */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Stage
        </p>
        <CollectionHeading
          type="stage"
          stageTitle="Client selection"
          stageStatus="upcoming"
          timeStampStatus="at-risk"
          deadlineDate="Dec 6, 2025"
          deadlineTime="End of day (5:00pm)"
        />
      </div>

      {/* Stage variant - different status */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Stage (in-progress, on-track)
        </p>
        <CollectionHeading
          type="stage"
          stageTitle="Photo selection"
          stageStatus="in-progress"
          timeStampStatus="on-track"
          deadlineDate="Jan 15, 2026"
          deadlineTime="Midday (12:00pm)"
        />
      </div>

      {/* Stage variant - delivered */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Type: Stage (delivered, no time stamp)
        </p>
        <CollectionHeading
          type="stage"
          stageTitle="Pre-check & Edition"
          stageStatus="delivered"
          showTimeStamp={false}
          deadlineDate="Nov 30, 2025"
          deadlineTime="End of day (5:00pm)"
        />
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Variants (from Figma):</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Main:</strong> "[collection] by [client]" title (24px, client in lime) + 
            progress + stage status + Participants/Settings buttons
          </li>
          <li>
            <strong>Stage:</strong> Stage title (24px, Block) + stage status + time stamp + deadline info
          </li>
        </ul>
      </div>
    </div>
  )
}
