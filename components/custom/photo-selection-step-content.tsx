"use client"

import * as React from "react"
import { format } from "date-fns"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { createClient } from "@/lib/supabase/client"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"
import type { Organization } from "@/lib/supabase/database.types"
import { cn } from "@/lib/utils"

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

async function fetchOrganizationById(id: string): Promise<string | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, name")
    .eq("id", id)
    .single()
  if (error) {
    console.error("[PhotoSelectionStepContent] Failed to fetch organization:", error)
    return null
  }
  const org = data as Organization | null
  return org?.name ?? null
}

export interface PhotoSelectionStepContentProps {
  draft: CollectionDraft
  /** Called when photo selection config fields change */
  onPhotoSelectionChange: (patch: Partial<Pick<CollectionConfig,
    | "photoSelectionPhotographerDueDate"
    | "photoSelectionPhotographerDueTime"
    | "photoSelectionClientDueDate"
    | "photoSelectionClientDueTime"
  >>) => void
  /** Chronology constraints (minDate, defaultDate, disabled, reason) per slot */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Photo selection block content per Figma node 710-1734582 and collections-logic §10.4, §10.5.
 * One form with two modules: Photographer pre-selection (due date/time, owner) and Client final selection (due date/time, owner).
 */
export function PhotoSelectionStepContent({
  draft,
  onPhotoSelectionChange,
  chronologyConstraints,
  className,
}: PhotoSelectionStepContentProps) {
  const c = draft.config
  const [photographerName, setPhotographerName] = React.useState<string>("—")
  const [clientName, setClientName] = React.useState<string>("—")
  const photographerConstraint = chronologyConstraints?.["photo_selection_photographer"]
  const clientConstraint = chronologyConstraints?.["photo_selection_client"]

  const photographerDueDate = c.photoSelectionPhotographerDueDate
    ? new Date(c.photoSelectionPhotographerDueDate + "T12:00:00")
    : undefined
  const clientDueDate = c.photoSelectionClientDueDate
    ? new Date(c.photoSelectionClientDueDate + "T12:00:00")
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
    const load = async () => {
      if (isSupabaseConfigured()) {
        const name = await fetchOrganizationById(eid)
        if (cancelled) return
        setPhotographerName(name ?? "—")
      } else {
        const res = await fetch(`/api/organizations/${eid}`)
        if (!res.ok) {
          setPhotographerName("—")
          return
        }
        const data = await res.json().catch(() => null)
        const entity = data?.entity as { name?: string } | null
        if (cancelled) return
        setPhotographerName(entity?.name ?? "—")
      }
    }
    load()
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
    const load = async () => {
      if (isSupabaseConfigured()) {
        const name = await fetchOrganizationById(eid)
        if (cancelled) return
        setClientName(name ?? "—")
      } else {
        const res = await fetch(`/api/organizations/${eid}`)
        if (!res.ok) {
          setClientName("—")
          return
        }
        const data = await res.json().catch(() => null)
        const entity = data?.entity as { name?: string } | null
        if (cancelled) return
        setClientName(entity?.name ?? "—")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientParticipant?.entityId, clientEntityId])

  React.useEffect(() => {
    if (!clientConstraint?.defaultDate || c.photoSelectionClientDueDate) return
    onPhotoSelectionChange({
      photoSelectionClientDueDate: clientConstraint.defaultDate,
      ...(clientConstraint.previousTimePreset && {
        photoSelectionClientDueTime: clientConstraint.previousTimePreset,
      }),
    })
  }, [
    clientConstraint?.defaultDate,
    clientConstraint?.previousTimePreset,
    c.photoSelectionClientDueDate,
    onPhotoSelectionChange,
  ])

  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      <Forms
        variant="horizontal-flow"
        firstTitle="Photographer pre-selection"
        firstContent={
          <>
            <RowVariants variant="2">
              <DatePicker
                label="Due date"
                date={photographerDueDate}
                onDateChange={(d) =>
                  onPhotoSelectionChange({
                    photoSelectionPhotographerDueDate: d
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
                value={c.photoSelectionPhotographerDueTime}
                onValueChange={(v) =>
                  onPhotoSelectionChange({
                    photoSelectionPhotographerDueTime: v || undefined,
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
        secondTitle="Client final selection"
        secondContent={
          <>
            <RowVariants variant="2">
              <DatePicker
                label="Due date"
                date={clientDueDate}
                onDateChange={(d) =>
                  onPhotoSelectionChange({
                    photoSelectionClientDueDate: d
                      ? format(d, "yyyy-MM-dd")
                      : undefined,
                  })
                }
                placeholder="December 10, 2025"
                minDate={clientConstraint?.minDate}
                disabled={clientConstraint?.isEnabled === false}
                helperText={clientConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.photoSelectionClientDueTime}
                onValueChange={(v) =>
                  onPhotoSelectionChange({
                    photoSelectionClientDueTime: v || undefined,
                  })
                }
                placeholder="Midday - 12:00pm"
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
