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

export interface CheckFinalsStepContentProps {
  draft: CollectionDraft
  /** Called when check finals config fields change. Client approve finals uses clientFinalsDeadline/clientFinalsDeadlineTime (modal deadline, editable here). */
  onCheckFinalsChange?: (patch: Partial<Pick<CollectionConfig,
    | "checkFinalsPhotographerDueDate"
    | "checkFinalsPhotographerDueTime"
    | "clientFinalsDeadline"
    | "clientFinalsDeadlineTime"
  >>) => void
  /** Chronology constraints (minDate, defaultDate, disabled, reason) per slot */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Check Finals block content per Figma node 716-1738375 and collections-logic §5.1.
 * One form with two modules: Photographer check and finals confirmation (Date, Time, Owner) and Client approve finals (Date, Time, Owner).
 */
export function CheckFinalsStepContent({
  draft,
  onCheckFinalsChange,
  chronologyConstraints,
  className,
}: CheckFinalsStepContentProps) {
  const c = draft.config
  const [photographerName, setPhotographerName] = React.useState<string>("—")
  const [clientName, setClientName] = React.useState<string>("—")
  const photographerConstraint = chronologyConstraints?.["check_finals_photographer"]
  const clientConstraint = chronologyConstraints?.["check_finals_client"]

  const photographerDueDate = c.checkFinalsPhotographerDueDate
    ? new Date(c.checkFinalsPhotographerDueDate + "T12:00:00")
    : undefined
  // Client approve finals: same as deadline from New Collection modal (entry point to change it)
  const clientDueDate = c.clientFinalsDeadline
    ? new Date(c.clientFinalsDeadline + "T12:00:00")
    : undefined

  const photographerParticipant = draft.participants.find((p) => p.role === "photographer")
  const clientParticipant = draft.participants.find((p) => p.role === "client")
  const clientEntityId = draft.config.clientEntityId

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
    const eid = clientParticipant?.entityId ?? clientEntityId
    if (!eid) {
      setClientName("—")
      return
    }
    let cancelled = false
    getRepositoryInstances()
      .entityRepository?.getEntityById(eid)
      .then((entity) => {
        if (cancelled) return
        setClientName(entity?.name ?? "—")
      })
    return () => {
      cancelled = true
    }
  }, [clientParticipant?.entityId, clientEntityId])

  React.useEffect(() => {
    if (!clientConstraint?.defaultDate || c.clientFinalsDeadline) return
    onCheckFinalsChange?.({
      clientFinalsDeadline: clientConstraint.defaultDate,
      ...(clientConstraint.previousTimePreset && {
        clientFinalsDeadlineTime: clientConstraint.previousTimePreset,
      }),
    })
  }, [
    clientConstraint?.defaultDate,
    clientConstraint?.previousTimePreset,
    c.clientFinalsDeadline,
    onCheckFinalsChange,
  ])

  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      <Forms
        variant="horizontal-flow"
        firstTitle="Photographer check finals"
        firstContent={
          <>
            <RowVariants variant="2">
              <DatePicker
                label="Date"
                date={photographerDueDate}
                onDateChange={(d) =>
                  onCheckFinalsChange?.({
                    checkFinalsPhotographerDueDate: d
                      ? format(d, "yyyy-MM-dd")
                      : undefined,
                  })
                }
                placeholder="Dec 13, 2025"
                minDate={photographerConstraint?.minDate}
                disabled={photographerConstraint?.isEnabled === false}
                helperText={photographerConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.checkFinalsPhotographerDueTime}
                onValueChange={(v) =>
                  onCheckFinalsChange?.({
                    checkFinalsPhotographerDueTime: v || undefined,
                  })
                }
                placeholder="Morning - 09:00am"
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
        secondTitle="Client approve finals"
        secondContent={
          <>
            <RowVariants variant="2">
              <DatePicker
                label="Date"
                date={clientDueDate}
                onDateChange={(d) =>
                  onCheckFinalsChange?.({
                    clientFinalsDeadline: d
                      ? format(d, "yyyy-MM-dd")
                      : undefined,
                  })
                }
                placeholder="Dec 14, 2025"
                minDate={clientConstraint?.minDate}
                disabled={clientConstraint?.isEnabled === false}
                helperText={clientConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.clientFinalsDeadlineTime}
                onValueChange={(v) =>
                  onCheckFinalsChange?.({
                    clientFinalsDeadlineTime: v || undefined,
                  })
                }
                placeholder="End of day - 05:00pm"
                disabled={clientConstraint?.isEnabled === false}
              />
            </RowVariants>
            <EntitySelected
              label="Owner"
              entityType="Client"
              value={clientName}
              locked
            />
          </>
        }
      />
    </div>
  )
}
