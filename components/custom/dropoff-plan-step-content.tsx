"use client"

import * as React from "react"
import { format } from "date-fns"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { TimePicker } from "@/components/ui/date-picker"
import { OptionPicker } from "./option-picker"
import { InformativeToast } from "./informative-toast"
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

async function fetchOrganizationAddress(id: string): Promise<string> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, street_address, zip_code, city, country")
    .eq("id", id)
    .single()
  if (error) {
    console.error("[DropoffPlanStepContent] Failed to fetch organization:", error)
    return "—"
  }
  const org = data as Organization | null
  if (!org) return "—"
  return formatOrgAddress(org)
}

/** Build one-line address from shooting Location (Figma: "Rua Concepción Arenal, 10 15006 A Coruña Spain") */
function formatShootingAddress(c: CollectionConfig): string {
  const parts = [
    c.shootingStreetAddress,
    c.shootingZipCode,
    c.shootingCity,
    c.shootingCountry,
  ].filter(Boolean)
  return parts.length ? parts.join(" ") : "—"
}

/** Build one-line address from entity Location (lab creation) */
function formatEntityLocation(loc: Location): string {
  const parts = [
    loc.streetAddress,
    loc.zipCode,
    loc.city,
    loc.country,
  ].filter(Boolean)
  return parts.length ? parts.join(" ") : "—"
}

/**
 * Split a one-line address into street, zipCode, city, country.
 * Heuristic: from the end, last word = country, second-to-last = city, digits = zip, rest = street.
 */
function parseOneLineAddress(
  line: string
): { street: string; zipCode: string; city: string; country: string } {
  const raw = line.trim()
  if (!raw) return { street: "", zipCode: "", city: "", country: "" }
  const tokens = raw.split(/\s+/)
  if (tokens.length === 1) return { street: raw, zipCode: "", city: "", country: "" }

  let country = ""
  let city = ""
  let zipCode = ""
  let streetParts: string[] = tokens

  // From the end: country (last alpha word), city (second-to-last alpha), zip (digits)
  if (tokens.length >= 1 && /^[a-zA-ZÀ-ÿ\-]+$/.test(tokens[tokens.length - 1])) {
    country = tokens[tokens.length - 1]
    streetParts = tokens.slice(0, -1)
  }
  if (streetParts.length >= 1 && /^[a-zA-ZÀ-ÿ\-]+$/.test(streetParts[streetParts.length - 1])) {
    city = streetParts[streetParts.length - 1]
    streetParts = streetParts.slice(0, -1)
  }
  if (streetParts.length >= 1 && /^\d{4,10}$/.test(streetParts[streetParts.length - 1])) {
    zipCode = streetParts[streetParts.length - 1]
    streetParts = streetParts.slice(0, -1)
  }

  return {
    street: streetParts.join(" ").trim(),
    zipCode,
    city,
    country,
  }
}

const SHIPPING_PROVIDER_OPTIONS = [
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "correos", label: "Correos" },
  { value: "seur", label: "SEUR" },
]

export interface DropoffPlanStepContentProps {
  draft: CollectionDraft
  /** Called when drop-off config fields change (includes shooting address when edited from this block) */
  onDropoffPlanChange: (patch: Partial<Pick<CollectionConfig,
    | "shootingStreetAddress"
    | "shootingZipCode"
    | "shootingCity"
    | "shootingCountry"
    | "dropoff_shipping_origin_address"
    | "dropoff_shipping_date"
    | "dropoff_shipping_time"
    | "dropoff_shipping_destination_address"
    | "dropoff_delivery_date"
    | "dropoff_delivery_time"
    | "dropoff_managing_shipping"
    | "dropoff_shipping_carrier"
    | "dropoff_shipping_tracking"
  >>) => void
  /** Options for "Responsible for shipping" (e.g. client + noba*). Built by parent from participants. */
  managingShippingOptions?: { value: string; label: string }[]
  /** Chronology constraints (minDate, defaultDate, disabled, reason) per slot */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Drop-off plan block content per Figma node 701-1730993.
 * Producer collects: Origin (Shooting address, Pick up date, Estimated time),
 * Destination (Lab address, Delivery date, Estimated time), Shipping details
 * (Responsible for shipping, Provider, Tracking number).
 * Participant summary is rendered by BlockTemplate via BlockHeading + ParticipantSummary.
 */
export function DropoffPlanStepContent({
  draft,
  onDropoffPlanChange,
  managingShippingOptions = [{ value: "noba", label: "noba*" }],
  chronologyConstraints,
  className,
}: DropoffPlanStepContentProps) {
  const c = draft.config
  const [labAddress, setLabAddress] = React.useState<string>("—")
  const shippingConstraint = chronologyConstraints?.["dropoff_plan_shipping"]
  const deliveryConstraint = chronologyConstraints?.["dropoff_plan_delivery"]
  const savedDestinationAddress = c.dropoff_shipping_destination_address?.trim()

  // Edit address dialog: "pickup" = shooting address, "delivery" = lab address
  const [editAddressType, setEditAddressType] = React.useState<"pickup" | "delivery" | null>(null)
  const [editStreet, setEditStreet] = React.useState("")
  const [editZipCode, setEditZipCode] = React.useState("")
  const [editCity, setEditCity] = React.useState("")
  const [editCountry, setEditCountry] = React.useState("")

  const openEditPickup = React.useCallback(() => {
    // Prefer parsing the saved one-line origin; otherwise use shooting address fields
    if (c.dropoff_shipping_origin_address?.trim()) {
      const parsed = parseOneLineAddress(c.dropoff_shipping_origin_address)
      setEditStreet(parsed.street)
      setEditZipCode(parsed.zipCode)
      setEditCity(parsed.city)
      setEditCountry(parsed.country)
    } else {
      setEditStreet(c.shootingStreetAddress ?? "")
      setEditZipCode(c.shootingZipCode ?? "")
      setEditCity(c.shootingCity ?? "")
      setEditCountry(c.shootingCountry ?? "")
    }
    setEditAddressType("pickup")
  }, [c.dropoff_shipping_origin_address, c.shootingStreetAddress, c.shootingZipCode, c.shootingCity, c.shootingCountry])

  const openEditDelivery = React.useCallback(() => {
    const current = labAddress !== "—" ? labAddress : (c.dropoff_shipping_destination_address ?? "")
    const parsed = parseOneLineAddress(current)
    setEditStreet(parsed.street)
    setEditZipCode(parsed.zipCode)
    setEditCity(parsed.city)
    setEditCountry(parsed.country)
    setEditAddressType("delivery")
  }, [labAddress, c.dropoff_shipping_destination_address])

  const closeEditAddress = React.useCallback(() => {
    setEditAddressType(null)
  }, [])

  const saveEditAddress = React.useCallback(() => {
    const street = editStreet.trim()
    const zip = editZipCode.trim()
    const city = editCity.trim()
    const country = editCountry.trim()
    const formatted = [street, zip, city, country].filter(Boolean).join(" ") || undefined
    // Only update dropoff_shipping_origin_address; do not touch shooting_* columns (those are edited in Shooting setup).
    if (editAddressType === "pickup" && formatted) {
      onDropoffPlanChange({ dropoff_shipping_origin_address: formatted })
    } else if (editAddressType === "delivery" && formatted) {
      onDropoffPlanChange({ dropoff_shipping_destination_address: formatted })
      setLabAddress(formatted)
    }
    closeEditAddress()
  }, [editAddressType, editStreet, editZipCode, editCity, editCountry, onDropoffPlanChange, closeEditAddress])

  // Local state for tracking number so typing is not overwritten by parent/server updates
  const [localTrackingNumber, setLocalTrackingNumber] = React.useState(c.dropoff_shipping_tracking ?? "")
  const [trackingFocused, setTrackingFocused] = React.useState(false)

  React.useEffect(() => {
    if (!trackingFocused) setLocalTrackingNumber(c.dropoff_shipping_tracking ?? "")
  }, [c.dropoff_shipping_tracking, trackingFocused])

  const pickUpDate = c.dropoff_shipping_date
    ? new Date(c.dropoff_shipping_date + "T12:00:00")
    : undefined
  const deliveryDate = c.dropoff_delivery_date
    ? new Date(c.dropoff_delivery_date + "T12:00:00")
    : undefined

  // Display: prefer saved drop-off origin, otherwise show shooting address
  const originAddress =
    c.dropoff_shipping_origin_address?.trim() || formatShootingAddress(c)

  React.useEffect(() => {
    const photoLab = draft.participants.find((p) => p.role === "photo_lab")
    const eid = photoLab?.entityId
    if (savedDestinationAddress) {
      setLabAddress(savedDestinationAddress)
      return
    }
    if (!eid) {
      setLabAddress("—")
      return
    }
    let cancelled = false
    const load = async () => {
      let address = "—"
      if (isSupabaseConfigured()) {
        address = await fetchOrganizationAddress(eid)
        if (cancelled) return
        setLabAddress(address)
      } else {
        const res = await fetch(`/api/organizations/${eid}`)
        if (!res.ok) {
          setLabAddress("—")
          return
        }
        const data = await res.json().catch(() => null)
        const entity = data?.entity as { location?: Location } | null
        if (cancelled) return
        address = entity?.location ? formatEntityLocation(entity.location) : "—"
        setLabAddress(address)
      }
      // Save destination address (lab address) to config
      if (address && address !== "—") {
        onDropoffPlanChange({ dropoff_shipping_destination_address: address })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [draft.participants, savedDestinationAddress, onDropoffPlanChange])

  React.useEffect(() => {
    if (!deliveryConstraint?.defaultDate || c.dropoff_delivery_date) return
    onDropoffPlanChange({
      dropoff_delivery_date: deliveryConstraint.defaultDate,
      ...(deliveryConstraint.previousTimePreset && {
        dropoff_delivery_time: deliveryConstraint.previousTimePreset,
      }),
    })
  }, [
    deliveryConstraint?.defaultDate,
    deliveryConstraint?.previousTimePreset,
    c.dropoff_delivery_date,
    onDropoffPlanChange,
  ])

  return (
    <div className={className}>
      <Forms
        variant="shipping-module"
        title="Shipping details (negatives from shooting to lab)"
        showShippingDetails={true}
        showInformativeToast={
          !!(
            c.dropoff_managing_shipping &&
            c.dropoff_managing_shipping !== "noba"
          )
        }
        originContent={
          <>
            <EntitySelected
              label="Pick-up"
              entityType="Address"
              value={originAddress}
              locked
              editable
              onEdit={openEditPickup}
            />
            <RowVariants variant="2">
              <DatePicker
                label="Date"
                date={pickUpDate}
                onDateChange={(d) =>
                  onDropoffPlanChange({
                    dropoff_shipping_date: d ? format(d, "yyyy-MM-dd") : undefined,
                  })
                }
                placeholder="Select date"
                minDate={shippingConstraint?.minDate}
                disabled={shippingConstraint?.isEnabled === false}
                helperText={shippingConstraint?.reason}
              />
              <TimePicker
                label="Estimated time"
                value={c.dropoff_shipping_time}
                onValueChange={(v) =>
                  onDropoffPlanChange({ dropoff_shipping_time: v })
                }
                placeholder="00:00:00"
                disabled={shippingConstraint?.isEnabled === false}
              />
            </RowVariants>
          </>
        }
        destinationContent={
          <>
            <EntitySelected
              label="Destination"
              entityType="Address"
              value={labAddress}
              locked
              editable
              onEdit={openEditDelivery}
            />
            <RowVariants variant="2">
              <DatePicker
                label="Date"
                date={deliveryDate}
                onDateChange={(d) =>
                  onDropoffPlanChange({
                    dropoff_delivery_date: d ? format(d, "yyyy-MM-dd") : undefined,
                  })
                }
                placeholder="Select date"
                minDate={deliveryConstraint?.minDate}
                disabled={deliveryConstraint?.isEnabled === false}
                helperText={deliveryConstraint?.reason}
              />
              <TimePicker
                label="Estimated time"
                value={c.dropoff_delivery_time}
                onValueChange={(v) =>
                  onDropoffPlanChange({ dropoff_delivery_time: v })
                }
                placeholder="00:00:00"
                disabled={deliveryConstraint?.isEnabled === false}
              />
            </RowVariants>
          </>
        }
        shippingDetailsContent={
          <RowVariants variant="3">
            <OptionPicker
              label="Responsible for shipping"
              options={managingShippingOptions}
              value={c.dropoff_managing_shipping ?? "noba"}
              onValueChange={(v) =>
                onDropoffPlanChange({ dropoff_managing_shipping: v || undefined })
              }
              placeholder="noba*"
            />
            <OptionPicker
              label="Shipping provider"
              options={SHIPPING_PROVIDER_OPTIONS}
              value={c.dropoff_shipping_carrier ?? ""}
              onValueChange={(v) =>
                onDropoffPlanChange({ dropoff_shipping_carrier: v || undefined })
              }
              placeholder="Search and select a provider"
            />
            <Field className="w-full">
              <FieldLabel>Tracking number</FieldLabel>
              <FieldContent>
                <Input
                  placeholder="Paste here the tracking number"
                  className="h-10 w-full"
                  value={localTrackingNumber}
                  onChange={(e) => {
                    const next = e.target.value
                    setLocalTrackingNumber(next)
                    onDropoffPlanChange({
                      dropoff_shipping_tracking: next || undefined,
                    })
                  }}
                  onFocus={() => setTrackingFocused(true)}
                  onBlur={() => setTrackingFocused(false)}
                />
              </FieldContent>
            </Field>
          </RowVariants>
        }
        informativeToastContent={
          <InformativeToast
            message="The client will be responsible for defining key details of the shipping to ensure successful tracking of the drop-off."
          />
        }
      />
      <Dialog open={editAddressType !== null} onOpenChange={(open) => !open && closeEditAddress()}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              Change {editAddressType === "pickup" ? "Pickup" : "Delivery"} address
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
                  placeholder="e.g. Gabriel Lobo 18"
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
                  placeholder="e.g. 28002"
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
