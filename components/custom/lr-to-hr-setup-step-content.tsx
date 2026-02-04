"use client"

import * as React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { SlotPicker } from "./slot-picker"
import { createClient } from "@/lib/supabase/client"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"
import type { Organization, Profile } from "@/lib/supabase/database.types"

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
    console.error("[LrToHrSetupStepContent] Failed to fetch organization:", error)
    return null
  }
  const org = data as Organization | null
  return org?.name ?? null
}

async function fetchUserById(id: string): Promise<{ firstName: string; lastName: string; email: string; entityId?: string } | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("profiles") as any)
    .select("id, email, first_name, last_name, organization_id")
    .eq("id", id)
    .single()
  if (error) {
    console.error("[LrToHrSetupStepContent] Failed to fetch user:", error)
    return null
  }
  const p = data as Profile | null
  if (!p) return null
  return {
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    email: p.email ?? "",
    entityId: p.organization_id ?? undefined,
  }
}

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
      ? "Hand Print Lab"
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

    const load = async () => {
      // Digital: show the photographer (person) who will deliver HR to the client.
      if (isDigital) {
        if (photographerUserIds.length === 0) {
          setOwnerName("—")
          return
        }

        if (isSupabaseConfigured()) {
          const users = (
            await Promise.all(photographerUserIds.map((id) => fetchUserById(id)))
          ).filter(Boolean) as { firstName: string; lastName: string; email: string; entityId?: string }[]

          // If photographer has an agency selected, prefer the user whose entityId is NOT the agency.
          const preferred =
            ownerParticipant?.entityId
              ? users.find((u) => u?.entityId && u.entityId !== ownerParticipant.entityId) ?? users[0]
              : users[0]

          const name = preferred ? `${preferred.firstName} ${preferred.lastName ?? ""}`.trim() : ""
          if (!cancelled) setOwnerName(name || preferred?.email || "—")
        } else {
          const userResList = await Promise.all(
            photographerUserIds.map((id) => fetch(`/api/users/${id}`).then((r) => (r.ok ? r.json() : null)))
          )
          const users = userResList
            .filter(Boolean)
            .map((data: { user?: { firstName?: string; lastName?: string; email?: string; entityId?: string } }) => data?.user)
            .filter(Boolean) as { firstName?: string; lastName?: string; email?: string; entityId?: string }[]

          const preferred =
            ownerParticipant?.entityId
              ? users.find((u) => u?.entityId && u.entityId !== ownerParticipant.entityId) ?? users[0]
              : users[0]

          const name = preferred ? `${preferred.firstName ?? ""} ${preferred.lastName ?? ""}`.trim() : ""
          if (!cancelled) setOwnerName(name || preferred?.email || "—")
        }
        return
      }

      // Handprint: show the responsible lab entity.
      if (!entityId) {
        setOwnerName("—")
        return
      }

      if (isSupabaseConfigured()) {
        const name = await fetchOrganizationById(entityId)
        if (!cancelled) setOwnerName(name ?? "—")
      } else {
        const res = await fetch(`/api/organizations/${entityId}`)
        if (!res.ok) {
          if (!cancelled) setOwnerName("—")
          return
        }
        const data = await res.json().catch(() => null)
        const entity = data?.entity as { name?: string } | null
        if (!cancelled) setOwnerName(entity?.name ?? "—")
      }
    }

    load()
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
          <SlotPicker
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
