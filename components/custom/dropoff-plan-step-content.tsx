"use client"

import * as React from "react"
import { format } from "date-fns"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { OptionPicker } from "./option-picker"
import { InformativeToast } from "./informative-toast"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getRepositoryInstances } from "@/lib/services"
import { createClient } from "@/lib/supabase/client"
import type { Location } from "@/lib/types"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"
import type { Organization } from "@/lib/supabase/database.types"

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function isSupabaseConfigured(): boolean {
  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"
  if (useMockAuth) return false
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

const SHIPPING_PROVIDER_OPTIONS = [
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "correos", label: "Correos" },
  { value: "seur", label: "SEUR" },
]

export interface DropoffPlanStepContentProps {
  draft: CollectionDraft
  /** Called when drop-off config fields change */
  onDropoffPlanChange: (patch: Partial<Pick<CollectionConfig,
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

  const pickUpDate = c.dropoff_shipping_date
    ? new Date(c.dropoff_shipping_date + "T12:00:00")
    : undefined
  const deliveryDate = c.dropoff_delivery_date
    ? new Date(c.dropoff_delivery_date + "T12:00:00")
    : undefined

  const originAddress = formatShootingAddress(c)

  // Save origin address (shooting address) to config when it changes
  React.useEffect(() => {
    if (originAddress && originAddress !== "—" && originAddress !== c.dropoff_shipping_origin_address) {
      onDropoffPlanChange({ dropoff_shipping_origin_address: originAddress })
    }
  }, [originAddress, c.dropoff_shipping_origin_address, onDropoffPlanChange])

  React.useEffect(() => {
    const lab = draft.participants.find((p) => p.role === "lab")
    const eid = lab?.entityId
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
        const entity = await getRepositoryInstances().entityRepository?.getEntityById(eid)
        if (cancelled) return
        address = entity?.location ? formatEntityLocation(entity.location) : "—"
        setLabAddress(address)
      }
      // Save destination address (lab address) to config
      if (address && address !== "—" && address !== c.dropoff_shipping_destination_address) {
        onDropoffPlanChange({ dropoff_shipping_destination_address: address })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [draft.participants, c.dropoff_shipping_destination_address, onDropoffPlanChange])

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
              label="Shooting address"
              entityType="Address"
              value={originAddress}
              locked
            />
            <RowVariants variant="2">
              <DatePicker
                label="Pick up date"
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
                placeholder="Select time"
                disabled={shippingConstraint?.isEnabled === false}
              />
            </RowVariants>
          </>
        }
        destinationContent={
          <>
            <EntitySelected
              label="Lab address"
              entityType="Address"
              value={labAddress}
              locked
            />
            <RowVariants variant="2">
              <DatePicker
                label="Delivery date"
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
                placeholder="Select time"
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
                  value={c.dropoff_shipping_tracking ?? ""}
                  onChange={(e) =>
                    onDropoffPlanChange({
                      dropoff_shipping_tracking: e.target.value || undefined,
                    })
                  }
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
    </div>
  )
}
