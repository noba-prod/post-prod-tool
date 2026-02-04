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
import type { Profile } from "@/lib/supabase/database.types"

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

async function fetchUserById(id: string): Promise<{ firstName: string; lastName: string; email: string } | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("profiles") as any)
    .select("id, email, first_name, last_name")
    .eq("id", id)
    .single()
  if (error) {
    console.error("[PhotographerCheckClientSelectionStepContent] Failed to fetch user:", error)
    return null
  }
  const p = data as Profile | null
  if (!p) return null
  return {
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    email: p.email ?? "",
  }
}

export interface PhotographerCheckClientSelectionStepContentProps {
  draft: CollectionDraft
  onPhotographerCheckChange: (patch: Partial<Pick<CollectionConfig, "photographerCheckDueDate" | "photographerCheckDueTime">>) => void
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Photographer check client selection — Hand print only (Figma 791-60709).
 * Form: Due date, Time, Owner (Photographer, locked). Shown before LR to HR setup.
 */
export function PhotographerCheckClientSelectionStepContent({
  draft,
  onPhotographerCheckChange,
  chronologyConstraints,
  className,
}: PhotographerCheckClientSelectionStepContentProps) {
  const c = draft.config
  const [ownerName, setOwnerName] = React.useState<string>("—")
  const constraint = chronologyConstraints?.["photographer_check_client_selection"]
  const photographerParticipant = draft.participants.find((p) => p.role === "photographer")
  const photographerUserIds = photographerParticipant?.userIds ?? []

  const dueDate = c.photographerCheckDueDate
    ? new Date(c.photographerCheckDueDate + "T12:00:00")
    : undefined

  React.useEffect(() => {
    let cancelled = false
    if (photographerUserIds.length === 0) {
      setOwnerName("—")
      return () => { cancelled = true }
    }
    const load = async () => {
      if (isSupabaseConfigured()) {
        const users = (
          await Promise.all(photographerUserIds.map((id) => fetchUserById(id)))
        ).filter(Boolean) as { firstName: string; lastName: string; email: string }[]
        const preferred = photographerParticipant?.entityId
          ? users.find((u) => (u as { entityId?: string }).entityId !== photographerParticipant.entityId) ?? users[0]
          : users[0]
        const name = preferred ? `${preferred.firstName} ${preferred.lastName ?? ""}`.trim() : ""
        if (!cancelled) setOwnerName(name || (preferred?.email ?? "—"))
      } else {
        const userResList = await Promise.all(
          photographerUserIds.map((id) => fetch(`/api/users/${id}`).then((r) => (r.ok ? r.json() : null)))
        )
        const users = userResList
          .map((data: { user?: { firstName?: string; lastName?: string; email?: string } }) => data?.user)
          .filter(Boolean) as { firstName?: string; lastName?: string; email?: string }[]
        const preferred = users[0]
        const name = preferred ? `${preferred.firstName ?? ""} ${preferred.lastName ?? ""}`.trim() : ""
        if (!cancelled) setOwnerName(name || (preferred?.email ?? "—"))
      }
    }
    load()
    return () => { cancelled = true }
  }, [photographerUserIds.join(","), photographerParticipant?.entityId])

  React.useEffect(() => {
    if (!constraint?.defaultDate || c.photographerCheckDueDate) return
    onPhotographerCheckChange({
      photographerCheckDueDate: constraint.defaultDate,
      ...(constraint.previousTimePreset && {
        photographerCheckDueTime: constraint.previousTimePreset,
      }),
    })
  }, [
    constraint?.defaultDate,
    constraint?.previousTimePreset,
    c.photographerCheckDueDate,
    onPhotographerCheckChange,
  ])

  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      <Forms
        variant="capsule"
        title="Photographer check client selection"
        showTitle={true}
      >
        <RowVariants variant="2">
          <DatePicker
            label="Due date"
            date={dueDate}
            onDateChange={(d) =>
              onPhotographerCheckChange({
                photographerCheckDueDate: d ? format(d, "yyyy-MM-dd") : undefined,
              })
            }
            placeholder="Dec 5, 2025"
            minDate={constraint?.minDate}
            maxDate={c.lrToHrDueDate}
            disabled={constraint?.isEnabled === false}
            helperText={constraint?.reason}
          />
          <SlotPicker
            label="Time"
            value={c.photographerCheckDueTime}
            onValueChange={(v) =>
              onPhotographerCheckChange({ photographerCheckDueTime: v })
            }
            placeholder="Midday - 12:00pm"
            disabled={constraint?.isEnabled === false}
          />
        </RowVariants>
        <EntitySelected
          label="Owner"
          entityType="Photographer"
          value={ownerName}
          locked
        />
      </Forms>
    </div>
  )
}
