"use client"

import * as React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { SlotPicker } from "./slot-picker"
import { TimePicker } from "@/components/ui/date-picker"
import { OptionPicker } from "./option-picker"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { Location } from "@/lib/types"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"
import type { Organization } from "@/lib/supabase/database.types"

function formatEntityLocation(loc: Location): string {
  const parts = [
    loc.streetAddress,
    loc.zipCode,
    loc.city,
    loc.country,
  ].filter(Boolean)
  return parts.length ? parts.join(" ") : "—"
}

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

function formatOrgAddress(org: Pick<Organization, "street_address" | "zip_code" | "city" | "country">): string {
  const parts = [org.street_address, org.zip_code, org.city, org.country].filter(Boolean)
  return parts.length ? parts.join(" ") : "—"
}

async function fetchOrganizationById(id: string): Promise<{ name: string; address: string } | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, name, street_address, zip_code, city, country")
    .eq("id", id)
    .single()
  if (error) {
    console.error("[LowResConfigStepContent] Failed to fetch organization:", error)
    return null
  }
  const org = data as Organization | null
  if (!org) return null
  return { name: org.name, address: formatOrgAddress(org) }
}

const SHIPPING_PROVIDER_OPTIONS = [
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "mrw", label: "MRW" },
  { value: "correos", label: "Correos" },
  { value: "seur", label: "SEUR" },
]

export interface LowResConfigStepContentProps {
  draft: CollectionDraft
  /** Called when low-res config fields change */
  onLowResConfigChange: (patch: Partial<Pick<CollectionConfig,
    | "lowResScanDeadlineDate"
    | "lowResScanDeadlineTime"
    | "lowResShippingOriginAddress"
    | "lowResShippingPickupDate"
    | "lowResShippingPickupTime"
    | "lowResShippingDestinationAddress"
    | "lowResShippingDeliveryDate"
    | "lowResShippingDeliveryTime"
    | "lowResShippingManaging"
    | "lowResShippingProvider"
    | "lowResShippingTracking"
  >>) => void
  /** Options for "Responsible for shipping" (e.g. lab + noba*). Built by parent from participants. */
  managingShippingOptions?: { value: string; label: string }[]
  /** Chronology constraints (minDate, defaultDate, disabled, reason) per slot */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Low-res scan block content per Figma node 707-1732747 and collections-logic §10.3.
 * Form 1: Negatives scanning to low-resolution (deadline date/time, owner Lab).
 * Form 2: Shipping details (negatives from lab to hand print lab) when handprint is different lab.
 */
export function LowResConfigStepContent({
  draft,
  onLowResConfigChange,
  managingShippingOptions = [{ value: "noba", label: "noba*" }],
  chronologyConstraints,
  className,
}: LowResConfigStepContentProps) {
  const c = draft.config
  const [labName, setLabName] = React.useState<string>("—")
  const [labAddress, setLabAddress] = React.useState<string>("—")
  const [handprintLabAddress, setHandprintLabAddress] = React.useState<string>("—")
  const deadlineConstraint = chronologyConstraints?.["low_res_config"]

  const deadlineDate = c.lowResScanDeadlineDate
    ? new Date(c.lowResScanDeadlineDate + "T12:00:00")
    : undefined
  const pickupDate = c.lowResShippingPickupDate
    ? new Date(c.lowResShippingPickupDate + "T12:00:00")
    : undefined
  const deliveryDate = c.lowResShippingDeliveryDate
    ? new Date(c.lowResShippingDeliveryDate + "T12:00:00")
    : undefined

  const labParticipant = draft.participants.find((p) => p.role === "lab")
  const handprintParticipant = draft.participants.find((p) => p.role === "handprint_lab")

  // Shipping details (lab → hand print lab) only when handprint lab is different from original
  // and was specified in the New Collection / Configuration modal (hasHandprint + handprintIsDifferentLab),
  // and the handprint lab entity has been assigned in Participants.
  const showShippingToHandprint = Boolean(
    c.hasHandprint &&
    c.handprintIsDifferentLab &&
    handprintParticipant?.entityId
  )

  // Edit address dialog: "origin" = lab address, "destination" = hand print lab address
  const [editAddressType, setEditAddressType] = React.useState<"origin" | "destination" | null>(null)
  const [editStreet, setEditStreet] = React.useState("")
  const [editZipCode, setEditZipCode] = React.useState("")
  const [editCity, setEditCity] = React.useState("")
  const [editCountry, setEditCountry] = React.useState("")

  const openEditOrigin = React.useCallback(() => {
    const current = labAddress !== "—" ? labAddress : (c.lowResShippingOriginAddress ?? "")
    setEditStreet(current)
    setEditZipCode("")
    setEditCity("")
    setEditCountry("")
    setEditAddressType("origin")
  }, [labAddress, c.lowResShippingOriginAddress])

  const openEditDestination = React.useCallback(() => {
    const current = handprintLabAddress !== "—" ? handprintLabAddress : (c.lowResShippingDestinationAddress ?? "")
    setEditStreet(current)
    setEditZipCode("")
    setEditCity("")
    setEditCountry("")
    setEditAddressType("destination")
  }, [handprintLabAddress, c.lowResShippingDestinationAddress])

  const closeEditAddress = React.useCallback(() => {
    setEditAddressType(null)
  }, [])

  const saveEditAddress = React.useCallback(() => {
    const street = editStreet.trim()
    const zip = editZipCode.trim()
    const city = editCity.trim()
    const country = editCountry.trim()
    const formatted = [street, zip, city, country].filter(Boolean).join(" ") || undefined
    if (editAddressType === "origin" && formatted) {
      onLowResConfigChange({ lowResShippingOriginAddress: formatted })
      setLabAddress(formatted)
    } else if (editAddressType === "destination" && formatted) {
      onLowResConfigChange({ lowResShippingDestinationAddress: formatted })
      setHandprintLabAddress(formatted)
    }
    closeEditAddress()
  }, [editAddressType, editStreet, editZipCode, editCity, editCountry, onLowResConfigChange, closeEditAddress])

  // Local state for tracking number so typing is not overwritten by parent/server updates
  const [localTrackingNumber, setLocalTrackingNumber] = React.useState(c.lowResShippingTracking ?? "")
  const [trackingFocused, setTrackingFocused] = React.useState(false)

  React.useEffect(() => {
    if (!trackingFocused) setLocalTrackingNumber(c.lowResShippingTracking ?? "")
  }, [c.lowResShippingTracking, trackingFocused])

  React.useEffect(() => {
    const eid = labParticipant?.entityId
    if (!eid) {
      setLabName("—")
      setLabAddress("—")
      return
    }
    let cancelled = false
    const load = async () => {
      let address = "—"
      if (isSupabaseConfigured()) {
        const org = await fetchOrganizationById(eid)
        if (cancelled) return
        setLabName(org?.name ?? "—")
        address = org?.address ?? "—"
        setLabAddress(address)
      } else {
        const res = await fetch(`/api/organizations/${eid}`)
        if (!res.ok) {
          setLabName("—")
          setLabAddress("—")
          return
        }
        const data = await res.json().catch(() => null)
        const entity = data?.entity as { name?: string; location?: { streetAddress?: string; zipCode?: string; city?: string; country?: string } } | null
        if (cancelled) return
        setLabName(entity?.name ?? "—")
        address = entity?.location
          ? formatEntityLocation({
              streetAddress: entity.location.streetAddress ?? "",
              zipCode: entity.location.zipCode ?? "",
              city: entity.location.city ?? "",
              country: entity.location.country ?? "",
            })
          : "—"
        setLabAddress(address)
      }
      // Save origin address (lab address) to config
      if (address && address !== "—" && address !== c.lowResShippingOriginAddress) {
        onLowResConfigChange({ lowResShippingOriginAddress: address })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [labParticipant?.entityId, c.lowResShippingOriginAddress, onLowResConfigChange])

  React.useEffect(() => {
    const eid = handprintParticipant?.entityId
    if (!eid) {
      setHandprintLabAddress("—")
      return
    }
    let cancelled = false
    const load = async () => {
      let address = "—"
      if (isSupabaseConfigured()) {
        const org = await fetchOrganizationById(eid)
        if (cancelled) return
        address = org?.address ?? "—"
        setHandprintLabAddress(address)
      } else {
        const res = await fetch(`/api/organizations/${eid}`)
        if (!res.ok) {
          setHandprintLabAddress("—")
          return
        }
        const data = await res.json().catch(() => null)
        const entity = data?.entity as { location?: { streetAddress?: string; zipCode?: string; city?: string; country?: string } } | null
        if (cancelled) return
        address = entity?.location
          ? formatEntityLocation({
              streetAddress: entity.location.streetAddress ?? "",
              zipCode: entity.location.zipCode ?? "",
              city: entity.location.city ?? "",
              country: entity.location.country ?? "",
            })
          : "—"
        setHandprintLabAddress(address)
      }
      // Save destination address (hand print lab address) to config
      if (address && address !== "—" && address !== c.lowResShippingDestinationAddress) {
        onLowResConfigChange({ lowResShippingDestinationAddress: address })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [handprintParticipant?.entityId, c.lowResShippingDestinationAddress, onLowResConfigChange])

  React.useEffect(() => {
    if (!deadlineConstraint?.defaultDate || c.lowResScanDeadlineDate) return
    onLowResConfigChange({
      lowResScanDeadlineDate: deadlineConstraint.defaultDate,
      ...(deadlineConstraint.previousTimePreset && {
        lowResScanDeadlineTime: deadlineConstraint.previousTimePreset,
      }),
    })
  }, [
    deadlineConstraint?.defaultDate,
    deadlineConstraint?.previousTimePreset,
    c.lowResScanDeadlineDate,
    onLowResConfigChange,
  ])

  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      {/* Form 1: Negatives scanning to low-resolution (Figma Block 1) */}
      <Forms
        variant="basic"
        title="Negatives scanning to low-resolution"
        showTitle={true}
        className="border border-zinc-200 rounded-xl p-4 w-full"
      >
        <RowVariants variant="2">
          <DatePicker
            label="Deadline date"
            date={deadlineDate}
            onDateChange={(d) =>
              onLowResConfigChange({
                lowResScanDeadlineDate: d ? format(d, "yyyy-MM-dd") : undefined,
              })
            }
            placeholder="Dec 5, 2025"
            minDate={deadlineConstraint?.minDate}
            disabled={deadlineConstraint?.isEnabled === false}
            helperText={deadlineConstraint?.reason}
          />
          <SlotPicker
            label="Time"
            value={c.lowResScanDeadlineTime}
            onValueChange={(v) =>
              onLowResConfigChange({ lowResScanDeadlineTime: v })
            }
            placeholder="Midday - 12:00pm"
            disabled={deadlineConstraint?.isEnabled === false}
          />
        </RowVariants>
        <EntitySelected
          label="Owner"
          entityType="Lab"
          value={labName}
          locked
        />
      </Forms>

      {/* Form 2: Shipping details (lab to hand print lab) - only when handprint is different lab */}
      {showShippingToHandprint && (
        <Forms
          variant="shipping-module"
          title="Shipping details (negatives from lab to hand print lab)"
          showShippingDetails={true}
          originContent={
            <>
              <EntitySelected
                label="Origin"
                entityType="Lab address"
                value={labAddress}
                locked
                editable
                onEdit={openEditOrigin}
              />
              <RowVariants variant="2">
                <DatePicker
                  label="Pick up date"
                  date={pickupDate}
                  onDateChange={(d) =>
                    onLowResConfigChange({
                      lowResShippingPickupDate: d
                        ? format(d, "yyyy-MM-dd")
                        : undefined,
                    })
                  }
                  placeholder="Dec 5, 2025"
                />
                <TimePicker
                  label="Estimated time"
                  value={c.lowResShippingPickupTime}
                  onValueChange={(v) =>
                    onLowResConfigChange({
                      lowResShippingPickupTime: v || undefined,
                    })
                  }
                  placeholder="00:00:00"
                />
              </RowVariants>
            </>
          }
          destinationContent={
            <>
              <EntitySelected
                label="Destination"
                entityType="Hand print lab address"
                value={handprintLabAddress}
                locked
                editable
                onEdit={openEditDestination}
              />
              <RowVariants variant="2">
                <DatePicker
                  label="Delivery date"
                  date={deliveryDate}
                  onDateChange={(d) =>
                    onLowResConfigChange({
                      lowResShippingDeliveryDate: d
                        ? format(d, "yyyy-MM-dd")
                        : undefined,
                    })
                  }
                  placeholder="Dec 5, 2025"
                />
                <TimePicker
                  label="Estimated time"
                  value={c.lowResShippingDeliveryTime}
                  onValueChange={(v) =>
                    onLowResConfigChange({
                      lowResShippingDeliveryTime: v || undefined,
                    })
                  }
                  placeholder="00:00:00"
                />
              </RowVariants>
            </>
          }
          shippingDetailsContent={
            <RowVariants variant="3">
              <OptionPicker
                label="Responsible for shipping"
                options={managingShippingOptions}
                value={c.lowResShippingManaging ?? ""}
                onValueChange={(v) =>
                  onLowResConfigChange({
                    lowResShippingManaging: v || undefined,
                  })
                }
                placeholder="noba*"
              />
              <OptionPicker
                label="Shipping provider"
                options={SHIPPING_PROVIDER_OPTIONS}
                value={c.lowResShippingProvider ?? ""}
                onValueChange={(v) =>
                  onLowResConfigChange({
                    lowResShippingProvider: v || undefined,
                  })
                }
                placeholder="MRW"
              />
              <Field className="w-full">
                <FieldLabel>Tracking number</FieldLabel>
                <FieldContent>
                  <Input
                    placeholder="10320TSO"
                    className="h-10 w-full"
                    value={localTrackingNumber}
                    onChange={(e) => {
                      const next = e.target.value
                      setLocalTrackingNumber(next)
                      onLowResConfigChange({
                        lowResShippingTracking: next || undefined,
                      })
                    }}
                    onFocus={() => setTrackingFocused(true)}
                    onBlur={() => setTrackingFocused(false)}
                  />
                </FieldContent>
              </Field>
            </RowVariants>
          }
        />
      )}
      <Dialog open={editAddressType !== null} onOpenChange={(open) => !open && closeEditAddress()}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              Change {editAddressType === "origin" ? "Pickup" : "Delivery"} address
            </DialogTitle>
            <DialogDescription>
              Update the address to show accurate shipping details to rest of participants.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <Field>
              <FieldLabel>Street address</FieldLabel>
              <FieldContent>
                <Input
                  value={editStreet}
                  onChange={(e) => setEditStreet(e.target.value)}
                  placeholder="e.g. C/ Olivar 38, Bajo Ext. Izq."
                  className="w-full"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>ZIP code</FieldLabel>
              <FieldContent>
                <Input
                  value={editZipCode}
                  onChange={(e) => setEditZipCode(e.target.value)}
                  placeholder="e.g. 28012"
                  className="w-full"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Country</FieldLabel>
              <FieldContent>
                <Input
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  placeholder="e.g. Spain"
                  className="w-full"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>City</FieldLabel>
              <FieldContent>
                <Input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Madrid"
                  className="w-full"
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter>
            <Button onClick={saveEditAddress}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
