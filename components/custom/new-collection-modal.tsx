"use client"

import * as React from "react"
import { format } from "date-fns"
import { ModalWindow } from "./modal-window"
import { Titles } from "./titles"
import { RowVariants } from "./row-variants"
import { OptionPicker } from "./option-picker"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { SwitchList } from "./switch-list"
import { Input } from "@/components/ui/input"
import { CheckSelection } from "./check-selection"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { getRepositoryInstances } from "@/lib/services"
import type { CollectionConfig } from "@/lib/domain/collections"

/**
 * New Collection modal — setup form per Figma (node 345-24895) and collections-logic §3.2.
 * Sections: Basic information, Low res to High-res.
 * Configures: name, client, manager, agency/lab/handprint/edition flags, deadline.
 * On submit emits CollectionConfig for createDraft.
 */

export interface NewCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Current user id (manager / producer) */
  managerUserId: string
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
  onSubmit,
  isSubmitting = false,
}: NewCollectionModalProps) {
  const [name, setName] = React.useState("")
  const [clientEntityId, setClientEntityId] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [deadlineDate, setDeadlineDate] = React.useState("")
  const [timeValue, setTimeValue] = React.useState("")
  const [hasAgency, setHasAgency] = React.useState(false)
  const [digitalOrHandprint, setDigitalOrHandprint] = React.useState<
    "digital" | "handprint" | null
  >(null)
  const [handprintIsDifferentLab, setHandprintIsDifferentLab] = React.useState(false)
  const [hasEditionStudio, setHasEditionStudio] = React.useState(false)
  const [selectedManagerUserId, setSelectedManagerUserId] = React.useState("")

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
        const repos = getRepositoryInstances()
        const entities = (await repos.entityRepository?.getAllEntities()) ?? []
        const clients = entities
          .filter((e) => e.type === "client")
          .map((e) => ({ id: e.id, name: e.name }))
        setClientOptions(clients)
        if (clients.length && !clientEntityId) setClientEntityId(clients[0].id)
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
        const repos = getRepositoryInstances()
        const users =
          (await repos.userRepository?.listUsersByEntityId(clientEntityId)) ?? []
        const opts = users.map((u) => ({
          value: u.id,
          label: `${u.firstName} ${u.lastName ?? ""}`.trim() || u.email,
        }))
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
      clientEntityId: cid,
      managerUserId: selectedManagerUserId.trim() || managerUserId.trim(),
      hasAgency,
      hasLowResLab,
      hasHandprint,
      handprintIsDifferentLab: hasHandprint ? handprintIsDifferentLab : false,
      hasEditionStudio,
      clientFinalsDeadline: deadlineDate.trim() || undefined,
    }
    const clientName = clientOptions.find((c) => c.id === cid)?.name
    onSubmit(config, clientName)
  }, [
    name,
    clientEntityId,
    selectedManagerUserId,
    managerUserId,
    hasAgency,
    hasLowResLab,
    hasHandprint,
    handprintIsDifferentLab,
    hasEditionStudio,
    deadlineDate,
    clientOptions,
    onSubmit,
  ])

  const valid = Boolean(
    name.trim() &&
      (clientEntityId.trim() || clientOptions[0]?.id) &&
      (selectedManagerUserId.trim() || managerOptions[0]?.value)
  )

  const switchItems = React.useMemo(() => {
    const items: { id: string; label: string; checked: boolean }[] = [
      { id: "edition", label: "Photographer request edition", checked: hasEditionStudio },
      { id: "agency", label: "Photographer collaborates with photo agency", checked: hasAgency },
    ]
    if (hasHandprint) {
      items.push({
        id: "handprint-lab",
        label: "Handprint different from original lab",
        checked: handprintIsDifferentLab,
      })
    }
    return items
  }, [hasEditionStudio, hasAgency, hasHandprint, handprintIsDifferentLab])

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
      title="New collection"
      subtitle="Specify the basic details to get started."
      showSubtitle={true}
      primaryLabel="Create collection"
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
                    className="w-full text-muted-foreground"
                  />
                </FieldContent>
              </Field>
            </RowVariants>
            <RowVariants variant="2">
              <DatePicker
                label="Deadline"
                date={
                  deadlineDate
                    ? new Date(deadlineDate + "T12:00:00")
                    : undefined
                }
                onDateChange={(d) =>
                  setDeadlineDate(d ? format(d, "yyyy-MM-dd") : "")
                }
                placeholder="December 14, 2025"
              />
              <TimePicker
                label="Time"
                value={timeValue}
                onValueChange={setTimeValue}
                placeholder="End of day - 05:00pm"
              />
            </RowVariants>
          </div>

          <Separator className="w-full" />

          {/* Low res to High-res */}
          <div className="flex flex-col gap-4 w-full">
            <Titles type="form" title="Low res to High-res" showSubtitle={false} />
            <RowVariants variant="2">
              <CheckSelection
                label="Digital"
                selected={digitalOrHandprint === "digital"}
                status="default"
                onClick={() =>
                  setDigitalOrHandprint((prev) =>
                    prev === "digital" ? null : "digital"
                  )
                }
              />
              <CheckSelection
                label="Hand print"
                selected={digitalOrHandprint === "handprint"}
                status="default"
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
