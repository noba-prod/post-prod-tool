"use client"

import * as React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { getRepositoryInstances } from "@/lib/services"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"

export interface LrToHrSetupStepContentProps {
  draft: CollectionDraft
  /** Called when LR to HR config fields change */
  onLrToHrSetupChange: (patch: Partial<Pick<CollectionConfig, "lrToHrDueDate" | "lrToHrDueTime">>) => void
  /** Chronology constraints (minDate, defaultDate, disabled, reason) — key is lr_to_hr_setup or handprint_high_res_config */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * LR to HR setup block content per Figma node 712-1735600 and collections-logic §10.6.
 * One form: "Low-res selection to high resolution" — Due date, Time, Owner (Photographer for Digital; Lab/Hand print lab for Handprint).
 */
export function LrToHrSetupStepContent({
  draft,
  onLrToHrSetupChange,
  chronologyConstraints,
  className,
}: LrToHrSetupStepContentProps) {
  const c = draft.config
  const [ownerName, setOwnerName] = React.useState<string>("—")
  const constraint =
    chronologyConstraints?.["lr_to_hr_setup"] ??
    chronologyConstraints?.["handprint_high_res_config"]
  const isDigital = !c.hasHandprint
  const ownerLabel = isDigital
    ? "Photographer"
    : c.handprintIsDifferentLab
      ? "Hand print lab"
      : "Lab"
  const ownerParticipant = isDigital
    ? draft.participants.find((p) => p.role === "photographer")
    : c.handprintIsDifferentLab
      ? draft.participants.find((p) => p.role === "handprint_lab")
      : draft.participants.find((p) => p.role === "lab")
  const entityId = !isDigital ? ownerParticipant?.entityId : undefined
  const photographerUserIds = (isDigital ? ownerParticipant?.userIds : undefined) ?? []

  const dueDate = c.lrToHrDueDate
    ? new Date(c.lrToHrDueDate + "T12:00:00")
    : undefined

  React.useEffect(() => {
    let cancelled = false
    const repos = getRepositoryInstances()

    ;(async () => {
      // Digital: show the photographer (person) who will deliver HR to the client.
      if (isDigital) {
        const userRepo = repos.userRepository
        if (!userRepo || photographerUserIds.length === 0) {
          setOwnerName("—")
          return
        }

        const users = (
          await Promise.all(photographerUserIds.map((id) => userRepo.getUserById(id)))
        ).filter(Boolean)

        // If photographer has an agency selected, their participant.entityId can be an agency entity.
        // Prefer the user whose entityId is NOT the agency entity id.
        const preferred =
          ownerParticipant?.entityId
            ? users.find((u) => u?.entityId && u.entityId !== ownerParticipant.entityId) ?? users[0]
            : users[0]

        const name =
          preferred ? `${preferred.firstName} ${preferred.lastName ?? ""}`.trim() : ""
        if (!cancelled) setOwnerName(name || preferred?.email || "—")
        return
      }

      // Handprint: show the responsible lab entity.
      if (!entityId) {
        setOwnerName("—")
        return
      }
      const entity = await repos.entityRepository?.getEntityById(entityId)
      if (!cancelled) setOwnerName(entity?.name ?? "—")
    })()

    return () => {
      cancelled = true
    }
  }, [entityId, isDigital, ownerParticipant?.entityId, photographerUserIds.join(",")])

  React.useEffect(() => {
    if (!constraint?.defaultDate || c.lrToHrDueDate) return
    onLrToHrSetupChange({
      lrToHrDueDate: constraint.defaultDate,
      ...(constraint.previousTimePreset && {
        lrToHrDueTime: constraint.previousTimePreset,
      }),
    })
  }, [
    constraint?.defaultDate,
    constraint?.previousTimePreset,
    c.lrToHrDueDate,
    onLrToHrSetupChange,
  ])

  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      <Forms
        variant="capsule"
        title="Low-res selection to high resolution"
        showTitle={true}
      >
        <RowVariants variant="2">
          <DatePicker
            label="Due date"
            date={dueDate}
            onDateChange={(d) =>
              onLrToHrSetupChange({
                lrToHrDueDate: d ? format(d, "yyyy-MM-dd") : undefined,
              })
            }
            placeholder="Dec 5, 2025"
            minDate={constraint?.minDate}
            disabled={constraint?.isEnabled === false}
            helperText={constraint?.reason}
          />
          <TimePicker
            label="Time"
            value={c.lrToHrDueTime}
            onValueChange={(v) =>
              onLrToHrSetupChange({ lrToHrDueTime: v })
            }
            placeholder="Midday - 12:00pm"
            disabled={constraint?.isEnabled === false}
          />
        </RowVariants>
        <EntitySelected
          label="Owner"
          entityType={ownerLabel}
          value={ownerName}
          locked
        />
      </Forms>
    </div>
  )
}
