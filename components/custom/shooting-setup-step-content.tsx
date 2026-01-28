"use client"

import * as React from "react"
import { format } from "date-fns"
import { Titles } from "./titles"
import { RowVariants } from "./row-variants"
import { Forms } from "./forms"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { OptionPicker } from "./option-picker"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"

const CITIES = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Seville",
  "Bilbao",
  "Málaga",
  "Zaragoza",
  "Murcia",
  "Palma",
  "Las Palmas",
  "A Coruña",
]

const COUNTRIES = [
  "Spain",
  "France",
  "Germany",
  "Italy",
  "Portugal",
  "United Kingdom",
  "United States",
  "Mexico",
  "Argentina",
  "Chile",
]

export interface ShootingSetupStepContentProps {
  draft: CollectionDraft
  /** Called when shooting config fields change */
  onShootingSetupChange: (patch: Partial<Pick<CollectionConfig,
    | "shootingStartDate"
    | "shootingStartTime"
    | "shootingEndDate"
    | "shootingEndTime"
    | "shootingStreetAddress"
    | "shootingZipCode"
    | "shootingCity"
    | "shootingCountry"
  >>) => void
  /** Chronology constraints (minDate, defaultDate, disabled, reason) per slot */
  chronologyConstraints?: Record<string, ChronologyConstraint>
  className?: string
}

/**
 * Shooting setup block content per Figma node 697-1729404.
 * Producer collects: Starting (date + time), Ending (date + time), Location (street, zip, city, country).
 * Participant summary (Client @…, Photographer @…, Edit participants) is rendered by BlockTemplate via ParticipantSummary.
 */
export function ShootingSetupStepContent({
  draft,
  onShootingSetupChange,
  chronologyConstraints,
  className,
}: ShootingSetupStepContentProps) {
  const c = draft.config
  const startConstraint = chronologyConstraints?.["shooting_setup"]
  const endConstraint = chronologyConstraints?.["shooting_setup_ending"]

  const startDate = c.shootingStartDate
    ? new Date(c.shootingStartDate + "T12:00:00")
    : undefined
  const endDate = c.shootingEndDate
    ? new Date(c.shootingEndDate + "T12:00:00")
    : undefined

  React.useEffect(() => {
    if (!endConstraint?.defaultDate || c.shootingEndDate) return
    onShootingSetupChange({
      shootingEndDate: endConstraint.defaultDate,
      ...(endConstraint.previousTimePreset && { shootingEndTime: endConstraint.previousTimePreset }),
    })
  }, [endConstraint?.defaultDate, endConstraint?.previousTimePreset, c.shootingEndDate, onShootingSetupChange])

  return (
    <div className={className}>
      <FieldGroup>
        {/* Starting / Ending — two capsules with arrow (Figma) */}
        <Forms
          variant="horizontal-flow"
          firstTitle="Starting"
          firstContent={
            <RowVariants variant="2">
              <DatePicker
                label="Date"
                date={startDate}
                onDateChange={(d) =>
                  onShootingSetupChange({
                    shootingStartDate: d ? format(d, "yyyy-MM-dd") : undefined,
                  })
                }
                placeholder="Dec 4, 2025"
                minDate={startConstraint?.minDate}
                disabled={startConstraint?.isEnabled === false}
                helperText={startConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.shootingStartTime}
                onValueChange={(v) =>
                  onShootingSetupChange({ shootingStartTime: v })
                }
                placeholder="Morning - 09:00am"
                disabled={startConstraint?.isEnabled === false}
              />
            </RowVariants>
          }
          secondTitle="Ending"
          secondContent={
            <RowVariants variant="2">
              <DatePicker
                label="Date"
                date={endDate}
                onDateChange={(d) =>
                  onShootingSetupChange({
                    shootingEndDate: d ? format(d, "yyyy-MM-dd") : undefined,
                  })
                }
                placeholder="Dec 14, 2025"
                minDate={endConstraint?.minDate}
                disabled={endConstraint?.isEnabled === false}
                helperText={endConstraint?.reason}
              />
              <TimePicker
                label="Time"
                value={c.shootingEndTime}
                onValueChange={(v) =>
                  onShootingSetupChange({ shootingEndTime: v })
                }
                placeholder="Midday - 12:00pm"
                disabled={endConstraint?.isEnabled === false}
              />
            </RowVariants>
          }
        />

        {/* Location (Figma) */}
        <div className="border border-zinc-200 rounded-xl p-4 w-full flex flex-col gap-5">
          <Titles type="form" title="Location" showSubtitle={false} />
          <RowVariants variant="1">
            <Field>
              <FieldLabel>Street address</FieldLabel>
              <FieldContent>
                <Input
                  value={c.shootingStreetAddress ?? ""}
                  onChange={(e) =>
                    onShootingSetupChange({
                      shootingStreetAddress: e.target.value || undefined,
                    })
                  }
                  placeholder="Carrer o Pinado, 25"
                  className="w-full"
                />
              </FieldContent>
            </Field>
          </RowVariants>
          <RowVariants variant="3">
            <Field>
              <FieldLabel>ZIP code</FieldLabel>
              <FieldContent>
                <Input
                  value={c.shootingZipCode ?? ""}
                  onChange={(e) =>
                    onShootingSetupChange({
                      shootingZipCode: e.target.value || undefined,
                    })
                  }
                  placeholder="01293"
                  className="w-full"
                />
              </FieldContent>
            </Field>
            <OptionPicker
              label="Country"
              value={c.shootingCountry ?? ""}
              onValueChange={(v) =>
                onShootingSetupChange({ shootingCountry: v || undefined })
              }
              placeholder="Spain"
              options={COUNTRIES.map((x) => ({ value: x, label: x }))}
            />
            <OptionPicker
              label="City"
              value={c.shootingCity ?? ""}
              onValueChange={(v) =>
                onShootingSetupChange({ shootingCity: v || undefined })
              }
              placeholder="A Coruña"
              options={CITIES.map((x) => ({ value: x, label: x }))}
            />
          </RowVariants>
        </div>
      </FieldGroup>
    </div>
  )
}
