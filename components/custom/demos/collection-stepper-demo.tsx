"use client"

import * as React from "react"
import { VerticalProgressIndicator } from "../vertical-progress-indicator"
import { CollectionStepSummary } from "../collection-step-summary"
import { CollectionStepper } from "../collection-stepper"

/**
 * Demo for Vertical Progress Indicator, Collection Step Summary, and Collection Stepper.
 */
export function CollectionStepperDemo() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      {/* Base: Vertical Progress Indicator */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Base: Vertical Progress Indicator
        </p>
        <div className="flex items-end gap-8">
          <div className="flex flex-col items-center gap-1">
            <VerticalProgressIndicator status="locked" />
            <span className="text-xs text-muted-foreground">Locked</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <VerticalProgressIndicator status="active" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <VerticalProgressIndicator status="completed" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>
      </div>

      {/* Base: Collection Step Summary */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Base: Collection Step Summary
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Locked</p>
            <CollectionStepSummary
              status="locked"
              title="Negatives Drop-off"
              deadlineDate="Dec 4, 2025"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <CollectionStepSummary
              status="active"
              title="Low-Res Scanning"
              stageStatus="in-progress"
              timeStampStatus="on-track"
              deadlineDate="Dec 4, 2025"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Completed</p>
            <CollectionStepSummary
              status="completed"
              title="Shooting"
              stageStatus="done"
              timeStampStatus="on-track"
              deadlineDate="Dec 4, 2025"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Completed + unread activity</p>
            <CollectionStepSummary
              status="completed"
              title="Shooting"
              stageStatus="done"
              timeStampStatus="on-track"
              deadlineDate="Dec 4, 2025"
              showAttentionDot
            />
          </div>
        </div>
      </div>

      {/* Master: Collection Stepper */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Master: Collection Stepper (all variants)
        </p>
        <div className="flex flex-col gap-4">
          <CollectionStepper
            status="locked"
            title="Negatives Drop-off"
            deadlineDate="Dec 4, 2025"
            showExpandButton
          />
          <CollectionStepper
            status="active"
            title="Low-Res Scanning"
            stageStatus="in-progress"
            timeStampStatus="on-track"
            deadlineDate="Dec 4, 2025"
            onStepClick={() => {}}
            showExpandButton
          />
          <CollectionStepper
            status="completed"
            title="Shooting"
            stageStatus="done"
            timeStampStatus="on-track"
            deadlineDate="Dec 4, 2025"
            showAttentionDot
            onStepClick={() => {}}
            showExpandButton
          />
        </div>
      </div>
    </div>
  )
}
