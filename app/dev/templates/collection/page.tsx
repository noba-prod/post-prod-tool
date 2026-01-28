"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  CollectionTemplate,
  type CollectionTemplateStep,
} from "@/components/custom/templates/collection-template"

/** Step definition with ISO deadline for status derivation (collections-logic §6: step status is deadline-based). */
type StepWithDeadline = Omit<CollectionTemplateStep, "status"> & {
  deadlineIso: string
}

/**
 * Derives step status from deadlines (collections-logic §6).
 * - deadline < asOf → completed
 * - first step with deadline >= asOf → active (ensures at least one active when any deadline is today/future)
 * - rest → locked
 */
function stepsWithStatusFromDeadlines(
  steps: StepWithDeadline[],
  asOfDate: string
): CollectionTemplateStep[] {
  let activeAssigned = false
  return steps.map((step) => {
    if (step.deadlineIso < asOfDate) {
      return { ...step, status: "completed" as const }
    }
    if (!activeAssigned) {
      activeAssigned = true
      return { ...step, status: "active" as const }
    }
    return { ...step, status: "locked" as const }
  })
}

/**
 * Example steps aligned with collections-logic.md §10.
 * deadlineIso drives status; deadlineDate is for display.
 */
const exampleStepsWithDeadlines: StepWithDeadline[] = [
  {
    id: "shooting",
    title: "Shooting",
    deadlineIso: "2025-11-28",
    deadlineLabel: "Deadline:",
    deadlineDate: "Nov 28, 2025",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "done",
    timeStampStatus: "on-track",
  },
  {
    id: "negatives-drop-off",
    title: "Negatives Drop-off",
    deadlineIso: "2025-12-04",
    deadlineLabel: "Deadline:",
    deadlineDate: "Dec 4, 2025",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "in-progress",
    timeStampStatus: "on-track",
  },
  {
    id: "low-res-scanning",
    title: "Low-Res Scanning",
    deadlineIso: "2025-12-10",
    deadlineLabel: "Deadline:",
    deadlineDate: "Dec 10, 2025",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "photographer-selection",
    title: "Photographer Selection",
    deadlineIso: "2025-12-18",
    deadlineLabel: "Deadline:",
    deadlineDate: "Dec 18, 2025",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "client-selection",
    title: "Client Selection",
    deadlineIso: "2025-12-24",
    deadlineLabel: "Deadline:",
    deadlineDate: "Dec 24, 2025",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "handprint-high-res",
    title: "Handprint High-Res",
    deadlineIso: "2026-01-06",
    deadlineLabel: "Deadline:",
    deadlineDate: "Jan 6, 2026",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "edition-request",
    title: "Edition Request",
    deadlineIso: "2026-01-12",
    deadlineLabel: "Deadline:",
    deadlineDate: "Jan 12, 2026",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "final-edits",
    title: "Final Edits",
    deadlineIso: "2026-01-20",
    deadlineLabel: "Deadline:",
    deadlineDate: "Jan 20, 2026",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "photographer-last-check",
    title: "Photographer Last Check",
    deadlineIso: "2026-01-25",
    deadlineLabel: "Deadline:",
    deadlineDate: "Jan 25, 2026",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
  {
    id: "client-confirmation",
    title: "Client Confirmation",
    deadlineIso: "2026-01-30",
    deadlineLabel: "Deadline:",
    deadlineDate: "Jan 30, 2026",
    deadlineTime: "End of day (5:00pm)",
    stageStatus: "upcoming",
    timeStampStatus: "on-track",
  },
]

/** Reference date for status derivation (deadline-based). Pick so at least one step is active. */
const AS_OF_DATE = "2025-12-05"

export default function CollectionTemplatePage() {
  const [view, setView] = React.useState<"basic" | "contextual">("basic")

  const steps = React.useMemo(() => {
    const source =
      view === "basic"
        ? exampleStepsWithDeadlines.slice(0, 4)
        : exampleStepsWithDeadlines
    return stepsWithStatusFromDeadlines(source, AS_OF_DATE)
  }, [view])

  return (
    <div className="min-h-screen">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant={view === "basic" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("basic")}
        >
          Basic
        </Button>
        <Button
          variant={view === "contextual" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("contextual")}
        >
          Contextual
        </Button>
      </div>

      <CollectionTemplate
        collectionName={view === "contextual" ? "Kids Summer'25" : "Example Collection"}
        clientName={view === "contextual" ? "@zara" : "@client"}
        progress={view === "contextual" ? 42 : 25}
        stageStatus="in-progress"
        photographerName={view === "contextual" ? "Tom Haser" : undefined}
        showPhotographerName={view === "contextual"}
        showParticipantsButton
        showSettingsButton
        onParticipants={() => {}}
        onSettings={() => {}}
        steps={steps}
        navBarProps={
          process.env.NODE_ENV !== "test"
            ? {
                variant: "noba",
                userName: "Martin Becerra",
                organization: "noba",
                role: "admin",
                isAdmin: true,
              }
            : undefined
        }
      />
    </div>
  )
}
