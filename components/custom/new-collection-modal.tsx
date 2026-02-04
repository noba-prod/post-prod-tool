"use client"

import * as React from "react"
import { format } from "date-fns"
import { ModalWindow } from "./modal-window"
import { Titles } from "./titles"
import { RowVariants } from "./row-variants"
import { OptionPicker } from "./option-picker"
import { DatePicker } from "./date-picker"
import { SlotPicker } from "./slot-picker"
import { SwitchList } from "./switch-list"
import { Input } from "@/components/ui/input"
import { CheckSelection } from "./check-selection"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
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

async function fetchClientsFromSupabase(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, name")
    .eq("type", "client")
    .order("name")
  if (error) {
    console.error("[NewCollectionModal] Failed to fetch clients:", error)
    return []
  }
  return (data ?? []).map((org: Pick<Organization, "id" | "name">) => ({ id: org.id, name: org.name }))
}

async function fetchUsersFromSupabase(organizationId: string): Promise<{ value: string; label: string }[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("profiles") as any)
    .select("id, email, first_name, last_name")
    .eq("organization_id", organizationId)
    .order("first_name")
  if (error) {
    console.error("[NewCollectionModal] Failed to fetch users:", error)
    return []
  }
  return (data ?? []).map((p: Profile) => ({
    value: p.id,
    label: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || p.id,
  }))
}

/**
 * New Collection modal — setup form per Figma (node 345-24895) and collections-logic §3.2.
 * Sections: Basic information, Type of shoot.
 * Configures: name, client, manager, agency/lab/handprint/edition flags, deadline.
 * On submit emits CollectionConfig for createDraft.
 */

export interface NewCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Current user id (manager / producer) */
  managerUserId: string
  /** When provided: edit mode — prefill form, title "Collection settings", primary "Save" */
  initialConfig?: Partial<CollectionConfig>
  /** Called with validated CollectionConfig and optional client display name (for toast) on submit */
  onSubmit: (config: CollectionConfig, clientDisplayName?: string) => void
  /** Disable primary button while submitting */
  isSubmitting?: boolean
}

const EMPTY_CONFIG: CollectionConfig = {
  name: "",
  clientEntityId: "",
  managerUserId: "",
  hasAgency: false,
  hasLowResLab: false,
  hasHandprint: false,
  handprintIsDifferentLab: false,
  hasEditionStudio: false,
}

export function NewCollectionModal({
  open,
  onOpenChange,
  managerUserId,
  initialConfig,
  onSubmit,
  isSubmitting = false,
}: NewCollectionModalProps) {
  const isEditMode = Boolean(initialConfig && Object.keys(initialConfig).length > 0)

  const [name, setName] = React.useState("")
  const [clientEntityId, setClientEntityId] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [publishingDate, setPublishingDate] = React.useState("")
  const [publishingTime, setPublishingTime] = React.useState("")
  const [hasAgency, setHasAgency] = React.useState(false)
  const [digitalOrHandprint, setDigitalOrHandprint] = React.useState<
    "digital" | "handprint" | null
  >(null)
  const [handprintIsDifferentLab, setHandprintIsDifferentLab] = React.useState(false)
  const [hasEditionStudio, setHasEditionStudio] = React.useState(false)
  const [selectedManagerUserId, setSelectedManagerUserId] = React.useState("")

  // Sync from initialConfig when modal opens (edit mode)
  React.useEffect(() => {
    if (!open) return
    if (initialConfig) {
      setName(initialConfig.name ?? "")
      setClientEntityId(initialConfig.clientEntityId ?? "")
      setReference(initialConfig.reference ?? "")
      setPublishingDate(initialConfig.publishingDate ?? "")
      setPublishingTime(initialConfig.publishingTime ?? "")
      setHasAgency(initialConfig.hasAgency ?? false)
      setDigitalOrHandprint(
        initialConfig.hasHandprint === true
          ? "handprint"
          : initialConfig.hasLowResLab === true
            ? "digital"
            : null
      )
      setHandprintIsDifferentLab(initialConfig.handprintIsDifferentLab ?? false)
      setHasEditionStudio(initialConfig.hasEditionStudio ?? false)
      setSelectedManagerUserId(initialConfig.managerUserId ?? "")
    } else {
      setName("")
      setClientEntityId("")
      setReference("")
      setPublishingDate("")
      setPublishingTime("")
      setHasAgency(false)
      setDigitalOrHandprint(null)
      setHandprintIsDifferentLab(false)
      setHasEditionStudio(false)
      setSelectedManagerUserId("")
    }
  }, [open, initialConfig])

  const [clientOptions, setClientOptions] = React.useState<
    { id: string; name: string }[]
  >([])
  const [managerOptions, setManagerOptions] = React.useState<
    { value: string; label: string }[]
  >([])

  React.useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        if (isSupabaseConfigured()) {
          const clients = await fetchClientsFromSupabase()
          setClientOptions(clients)
          if (clients.length && !clientEntityId) setClientEntityId(clients[0].id)
        } else {
          const res = await fetch("/api/organizations", { cache: "no-store" })
          if (!res.ok) {
            setClientOptions([])
            return
          }
          const data = await res.json().catch(() => null) as { organizations?: Array<{ id: string; name: string; type: string }> } | null
          const clients = (data?.organizations ?? [])
            .filter((org) => org.type === "client")
            .map((org) => ({ id: org.id, name: org.name }))
          setClientOptions(clients)
          if (clients.length && !clientEntityId) setClientEntityId(clients[0].id)
        }
      } catch {
        setClientOptions([])
      }
    }
    load()
  }, [open, clientEntityId])

  React.useEffect(() => {
    if (!open || !clientEntityId) {
      setManagerOptions([])
      return
    }
    const load = async () => {
      try {
        let opts: { value: string; label: string }[] = []
        if (isSupabaseConfigured()) {
          opts = await fetchUsersFromSupabase(clientEntityId)
        } else {
          const res = await fetch(`/api/organizations/${clientEntityId}`)
          if (!res.ok) {
            setManagerOptions([])
            return
          }
          const data = await res.json().catch(() => null) as { teamMembers?: Array<{ id: string; firstName?: string; lastName?: string; email?: string }> } | null
          const users = data?.teamMembers ?? []
          opts = users.map((u) => ({
            value: u.id,
            label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || (u.email ?? ""),
          }))
        }
        setManagerOptions(opts)
        setSelectedManagerUserId((prev) => {
          if (opts.some((o) => o.value === prev)) return prev
          if (opts.some((o) => o.value === managerUserId)) return managerUserId
          return opts[0]?.value ?? ""
        })
      } catch {
        setManagerOptions([])
      }
    }
    load()
  }, [open, clientEntityId, managerUserId])

  React.useEffect(() => {
    if (digitalOrHandprint !== "handprint") setHandprintIsDifferentLab(false)
  }, [digitalOrHandprint])

  const hasLowResLab = digitalOrHandprint === "digital"
  const hasHandprint = digitalOrHandprint === "handprint"

  const handleSubmit = React.useCallback(() => {
    const cid = clientEntityId.trim() || clientOptions[0]?.id || ""
    const config: CollectionConfig = {
      ...EMPTY_CONFIG,
      name: name.trim(),
      reference: reference.trim() || undefined,
      clientEntityId: cid,
      // managerUserId = selected CLIENT manager (role='manager' in collection_members)
      managerUserId: selectedManagerUserId.trim(),
      // ownerUserId = logged-in noba producer creating the collection (role='producer', is_owner=true)
      ownerUserId: managerUserId.trim(),
      hasAgency,
      hasLowResLab,
      hasHandprint,
      handprintIsDifferentLab: hasHandprint ? handprintIsDifferentLab : false,
      hasEditionStudio,
      publishingDate: publishingDate.trim() || undefined,
      publishingTime: publishingTime.trim() || undefined,
    }
    const clientName = clientOptions.find((c) => c.id === cid)?.name
    onSubmit(config, clientName)
  }, [
    name,
    reference,
    clientEntityId,
    selectedManagerUserId,
    managerUserId,
    hasAgency,
    hasLowResLab,
    hasHandprint,
    handprintIsDifferentLab,
    hasEditionStudio,
    publishingDate,
    publishingTime,
    clientOptions,
    onSubmit,
  ])

  const valid = Boolean(
    name.trim() &&
      (clientEntityId.trim() || clientOptions[0]?.id) &&
      (selectedManagerUserId.trim() || managerOptions[0]?.value)
  )

  const switchItems = React.useMemo(() => {
    const items: { id: string; label: string; checked: boolean; disabled?: boolean }[] = [
      { id: "agency", label: "Photographer collaborates with photo agency", checked: hasAgency, disabled: isEditMode },
    ]
    if (hasHandprint) {
      items.push({
        id: "handprint-lab",
        label: "Handprint different from original lab",
        checked: handprintIsDifferentLab,
        disabled: isEditMode,
      })
    }
    items.push({ id: "edition", label: "Photographer requests edition", checked: hasEditionStudio, disabled: isEditMode })
    return items
  }, [hasEditionStudio, hasAgency, hasHandprint, handprintIsDifferentLab, isEditMode])

  const handleSwitchChange = React.useCallback(
    (id: string, checked: boolean) => {
      if (id === "edition") setHasEditionStudio(checked)
      if (id === "agency") setHasAgency(checked)
      if (id === "handprint-lab") setHandprintIsDifferentLab(checked)
    },
    []
  )

  return (
    <ModalWindow
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Collection settings" : "New collection"}
      subtitle={isEditMode ? "Change the main characteristics of the collection." : "Specify the basic details to get started."}
      showSubtitle={true}
      primaryLabel={isEditMode ? "Save" : "Create collection"}
      secondaryLabel="Cancel"
      showPrimary={true}
      showSecondary={true}
      primaryDisabled={!valid || isSubmitting}
      onPrimaryClick={handleSubmit}
      onSecondaryClick={() => onOpenChange(false)}
      width="600px"
    >
      <div className="p-5 space-y-5">
        <FieldGroup>
          {/* Basic information */}
          <div className="flex flex-col gap-4 w-full">
            <Titles type="form" title="Basic information" showSubtitle={false} />
            <RowVariants variant="2">
              <OptionPicker
                label="Client"
                value={clientEntityId}
                onValueChange={setClientEntityId}
                placeholder="Zara"
                options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
                disabled={isEditMode}
              />
              <Field>
                <FieldLabel>Collection name</FieldLabel>
                <FieldContent>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Kids Summer'25"
                    className="w-full"
                  />
                </FieldContent>
              </Field>
            </RowVariants>
            <RowVariants variant="2">
              <OptionPicker
                label="Manager (admin)"
                value={selectedManagerUserId}
                onValueChange={setSelectedManagerUserId}
                placeholder="Erika Goldner"
                options={managerOptions}
              />
              <Field>
                <FieldLabel>Reference</FieldLabel>
                <FieldContent>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="ZK029291"
                    className="w-full"
                  />
                </FieldContent>
              </Field>
            </RowVariants>
            <RowVariants variant="2">
              <DatePicker
                label="Publishing date"
                date={
                  publishingDate
                    ? new Date(publishingDate + "T12:00:00")
                    : undefined
                }
                onDateChange={(d) =>
                  setPublishingDate(d ? format(d, "yyyy-MM-dd") : "")
                }
                placeholder="Select date"
              />
              <SlotPicker
                label="Publishing time"
                value={publishingTime}
                onValueChange={setPublishingTime}
                placeholder="End of day - 05:00pm"
              />
            </RowVariants>
          </div>

          <Separator className="w-full" />

          {/* Type of shoot — disabled in edit mode to avoid changing workflow config */}
          <div
            className={cn(
              "flex flex-col gap-4 w-full",
              isEditMode && "opacity-30 pointer-events-none"
            )}
          >
            <Titles type="form" title="Type of shoot" showSubtitle={false} />
            <RowVariants variant="2">
              <CheckSelection
                label="Digital"
                selected={digitalOrHandprint === "digital"}
                status={isEditMode ? "disabled" : "default"}
                onClick={() =>
                  setDigitalOrHandprint((prev) =>
                    prev === "digital" ? null : "digital"
                  )
                }
              />
              <CheckSelection
                label="Analog"
                selected={digitalOrHandprint === "handprint"}
                status={isEditMode ? "disabled" : "default"}
                onClick={() =>
                  setDigitalOrHandprint((prev) =>
                    prev === "handprint" ? null : "handprint"
                  )
                }
              />
            </RowVariants>
            <SwitchList
              items={switchItems}
              onItemChange={handleSwitchChange}
              showSeparators={true}
            />
          </div>
        </FieldGroup>
      </div>
    </ModalWindow>
  )
}
