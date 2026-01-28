"use client"

import * as React from "react"
import { format } from "date-fns"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { getRepositoryInstances } from "@/lib/services"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"
import { cn } from "@/lib/utils"

export interface EditionConfigStepContentProps {
  draft: CollectionDraft
  /** Called when edition config fields change */
  onEditionConfigChange: (patch: Partial<Pick<CollectionConfig,
    | "editionPhotographerDueDate"
    | "editionPhotographerDueTime"
    | "editionStudioDueDate"
    | "editionStudioDueTime"
  >>) => void
  /** Chronology constraints (minDate, defaultDate, disabled, reason) per slot */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Pre-check & Edition block content per Figma node 714-1736413 and collections-logic §10.7, §10.8.
 * One form with two modules: Edition request (Photographer — due date/time, owner) and Final edits (Edition studio — due date/time, owner).
 */
export function EditionConfigStepContent({
  draft,
  onEditionConfigChange,
  chronologyConstraints,
  className,
}: EditionConfigStepContentProps) {
  const c = draft.config
  const [photographerName, setPhotographerName] = React.useState<string>("—")
  const [editionStudioName, setEditionStudioName] = React.useState<string>("—")
  const photographerConstraint = chronologyConstraints?.["edition_config_photographer"]
  const studioConstraint = chronologyConstraints?.["edition_config_studio"]

  const photographerDueDate = c.editionPhotographerDueDate
    ? new Date(c.editionPhotographerDueDate + "T12:00:00")
    : undefined
  const editionStudioDueDate = c.editionStudioDueDate
    ? new Date(c.editionStudioDueDate + "T12:00:00")
    : undefined

  const photographerParticipant = draft.participants.find((p) => p.role === "photographer")
  const editionStudioParticipant = draft.participants.find((p) => p.role === "edition_studio")

  React.useEffect(() => {
    const eid = photographerParticipant?.entityId
    if (!eid) {
      setPhotographerName("—")
      return
    }
    let cancelled = false
    getRepositoryInstances()
      .entityRepository?.getEntityById(eid)
      .then((entity) => {
        if (cancelled) return
        setPhotographerName(entity?.name ?? "—")
      })
    return () => {
      cancelled = true
    }
  }, [photographerParticipant?.entityId])

  React.useEffect(() => {
    const eid = editionStudioParticipant?.entityId
    if (!eid) {
      setEditionStudioName("—")
      return
    }
    let cancelled = false
    getRepositoryInstances()
      .entityRepository?.getEntityById(eid)
      .then((entity) => {
        if (cancelled) return
        setEditionStudioName(entity?.name ?? "—")
      })
    return () => {
      cancelled = true
    }
  }, [editionStudioParticipant?.entityId])

  React.useEffect(() => {
    if (!studioConstraint?.defaultDate || c.editionStudioDueDate) return
    onEditionConfigChange({
      editionStudioDueDate: studioConstraint.defaultDate,
      ...(studioConstraint.previousTimePreset && {
        editionStudioDueTime: studioConstraint.previousTimePreset,
      }),
    })
  }, [
    studioConstraint?.defaultDate,
    studioConstraint?.previousTimePreset,
    c.editionStudioDueDate,
    onEditionConfigChange,
  ])

  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      <Forms
        variant="horizontal-flow"
        firstTitle="Edition request"
        firstContent={
          <>
            <RowVariants variant="2">
              <DatePicker
                label="Due date"
                date={photographerDueDate}
                onDateChange={(d) =>
                  onEditionConfigChange({
                    editionPhotographerDueDate: d
                      ? format(d, "yyyy-MM-dd")
                      : undefined,
                  })
                }
                placeholder="December 08, 2025"
                minDate={photographerConstraint?.minDate}
                disabled={photographerConstraint?.isEnabled === false}
                helperText={photographerConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.editionPhotographerDueTime}
                onValueChange={(v) =>
                  onEditionConfigChange({
                    editionPhotographerDueTime: v || undefined,
                  })
                }
                placeholder="End of day - 05:00pm"
                disabled={photographerConstraint?.isEnabled === false}
              />
            </RowVariants>
            <EntitySelected
              label="Owner"
              entityType="Photographer"
              value={photographerName}
              locked
            />
          </>
        }
        secondTitle="Final edits"
        secondContent={
          <>
            <RowVariants variant="2">
              <DatePicker
                label="Due date"
                date={editionStudioDueDate}
                onDateChange={(d) =>
                  onEditionConfigChange({
                    editionStudioDueDate: d
                      ? format(d, "yyyy-MM-dd")
                      : undefined,
                  })
                }
                placeholder="December 10, 2025"
                minDate={studioConstraint?.minDate}
                disabled={studioConstraint?.isEnabled === false}
                helperText={studioConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.editionStudioDueTime}
                onValueChange={(v) =>
                  onEditionConfigChange({
                    editionStudioDueTime: v || undefined,
                  })
                }
                placeholder="Midday - 12:00pm"
                disabled={studioConstraint?.isEnabled === false}
              />
            </RowVariants>
            <EntitySelected
              label="Owner"
              entityType="Edition studio"
              value={editionStudioName}
              locked
            />
          </>
        }
      />
    </div>
  )
}
