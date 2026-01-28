"use client"

import * as React from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Forms } from "./forms"
import { RowVariants } from "./row-variants"
import { EntitySelected } from "./entity-selected"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { OptionPicker } from "./option-picker"
import { Field, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getRepositoryInstances } from "@/lib/services"
import type { Location } from "@/lib/types"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"

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
    | "lowResShippingPickupDate"
    | "lowResShippingPickupTime"
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

  React.useEffect(() => {
    const eid = labParticipant?.entityId
    if (!eid) {
      setLabName("—")
      setLabAddress("—")
      return
    }
    let cancelled = false
    getRepositoryInstances()
      .entityRepository?.getEntityById(eid)
      .then((entity) => {
        if (cancelled) return
        setLabName(entity?.name ?? "—")
        setLabAddress(
          entity?.location ? formatEntityLocation(entity.location) : "—"
        )
      })
    return () => {
      cancelled = true
    }
  }, [labParticipant?.entityId])

  React.useEffect(() => {
    const eid = handprintParticipant?.entityId
    if (!eid) {
      setHandprintLabAddress("—")
      return
    }
    let cancelled = false
    getRepositoryInstances()
      .entityRepository?.getEntityById(eid)
      .then((entity) => {
        if (cancelled) return
        setHandprintLabAddress(
          entity?.location ? formatEntityLocation(entity.location) : "—"
        )
      })
    return () => {
      cancelled = true
    }
  }, [handprintParticipant?.entityId])

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
          <TimePicker
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
                  placeholder="Midday - 12:00pm"
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
                  placeholder="End of day - 05:00pm"
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
                    value={c.lowResShippingTracking ?? ""}
                    onChange={(e) =>
                      onLowResConfigChange({
                        lowResShippingTracking: e.target.value || undefined,
                      })
                    }
                  />
                </FieldContent>
              </Field>
            </RowVariants>
          }
        />
      )}
    </div>
  )
}
