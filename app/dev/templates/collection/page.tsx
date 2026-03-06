"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  CollectionTemplate,
  type CollectionTemplateStep,
} from "@/components/custom/templates/collection-template"
import {
  getViewStepDefinitions,
  viewStepsWithStatus,
  type ViewStepsConfigInput,
} from "@/lib/domain/collections/view-mode-steps"

/** Reference date for status derivation (deadline-based). */
const AS_OF_DATE = "2025-12-05"

/** Scenario variants from the collection configuration matrix (aligned with image). */
const SCENARIOS: Array<{
  id: string
  label: string
  config: ViewStepsConfigInput
}> = [
  {
    id: "digital-only",
    label: "1. Digital only",
    config: {
      hasHandprint: false,
      hasEditionStudio: false,
      handprintIsDifferentLab: false,
    },
  },
  {
    id: "digital-edition",
    label: "2. Digital + Edition",
    config: {
      hasHandprint: false,
      hasEditionStudio: true,
      handprintIsDifferentLab: false,
    },
  },
  {
    id: "handprint-only",
    label: "3. Hand print only",
    config: {
      hasHandprint: true,
      hasEditionStudio: false,
      handprintIsDifferentLab: false,
      lowResNoShippingDetails: true,
    },
  },
  {
    id: "handprint-different-lab",
    label: "4. Hand print + Different lab",
    config: {
      hasHandprint: true,
      hasEditionStudio: false,
      handprintIsDifferentLab: true,
    },
  },
  {
    id: "handprint-edition-different-lab",
    label: "5. Hand print + Edition + Different lab",
    config: {
      hasHandprint: true,
      hasEditionStudio: true,
      handprintIsDifferentLab: true,
    },
  },
]

function definitionsToTemplateSteps(
  withStatus: ReturnType<typeof viewStepsWithStatus>
): CollectionTemplateStep[] {
  return withStatus.map((step) => ({
    id: step.id,
    title: step.title,
    status: step.status,
    stageStatus:
      step.status === "completed"
        ? "done"
        : step.status === "active"
          ? "in-progress"
          : "upcoming",
    timeStampStatus: "on-track",
    deadlineLabel: "Deadline:",
    deadlineDate: step.deadlineDate ?? "—",
    deadlineTime: "End of day (5:00pm)",
    inactive: step.inactive,
    annotation: step.annotation,
    attention: step.attention,
  }))
}

export default function CollectionTemplatePage() {
  const [scenarioId, setScenarioId] = React.useState<string>(SCENARIOS[0].id)

  const scenario = React.useMemo(
    () => SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId]
  )

  const steps = React.useMemo(() => {
    const definitions = getViewStepDefinitions(scenario.config)
    const withStatus = viewStepsWithStatus(definitions, AS_OF_DATE)
    return definitionsToTemplateSteps(withStatus)
  }, [scenario.config])

  return (
    <div className="min-h-screen">
      <div className="fixed top-4 right-4 z-50 flex flex-wrap gap-2 max-w-[90vw]">
        {SCENARIOS.map((s) => (
          <Button
            key={s.id}
            variant={scenarioId === s.id ? "default" : "outline"}
            size="sm"
            onClick={() => setScenarioId(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <CollectionTemplate
        collectionName="Kids Summer'25"
        clientName="@zara"
        progress={42}
        stageStatus="in-progress"
        shootingType={scenario.config.hasHandprint ? (scenario.config.handprintVariant === "hr" ? "handprint_hr" : "handprint_hp") : "digital"}
        photographerName="Tom Haser"
        showPhotographerName
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
