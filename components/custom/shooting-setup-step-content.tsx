"use client"

import * as React from "react"
import { format } from "date-fns"
import { Titles } from "./titles"
import { RowVariants } from "./row-variants"
import { Forms } from "./forms"
import { DatePicker } from "./date-picker"
import { TimePicker } from "./time-picker"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { COUNTRY_NAMES, getCitiesByCountryName } from "@/lib/data/location"
import type { CollectionDraft, ChronologyConstraint } from "@/lib/domain/collections"
import type { CollectionConfig } from "@/lib/domain/collections"

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
  const baseId = React.useId().replace(/:/g, "")
  const c = draft?.config
  if (!c) return null
  const startConstraint = chronologyConstraints?.["shooting_setup"]
  const endConstraint = chronologyConstraints?.["shooting_setup_ending"]

  // Local state for street address and ZIP so typing is not overwritten by parent/server updates
  const [localStreetAddress, setLocalStreetAddress] = React.useState(c.shootingStreetAddress ?? "")
  const [localZipCode, setLocalZipCode] = React.useState(c.shootingZipCode ?? "")
  const [streetFocused, setStreetFocused] = React.useState(false)
  const [zipFocused, setZipFocused] = React.useState(false)

  React.useEffect(() => {
    if (!streetFocused) setLocalStreetAddress(c.shootingStreetAddress ?? "")
  }, [c.shootingStreetAddress, streetFocused])

  React.useEffect(() => {
    if (!zipFocused) setLocalZipCode(c.shootingZipCode ?? "")
  }, [c.shootingZipCode, zipFocused])

  // Country/City combobox state (full list + custom value on close)
  const [countryInputValue, setCountryInputValue] = React.useState(c.shootingCountry ?? "")
  const [cityInputValue, setCityInputValue] = React.useState(c.shootingCity ?? "")
  const [countryOpen, setCountryOpen] = React.useState(false)
  const [cityOpen, setCityOpen] = React.useState(false)
  const selectedCountryRef = React.useRef<string | null>(null)
  const selectedCityRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!countryOpen) setCountryInputValue(c.shootingCountry ?? "")
  }, [countryOpen, c.shootingCountry])

  React.useEffect(() => {
    if (!cityOpen) setCityInputValue(c.shootingCity ?? "")
  }, [cityOpen, c.shootingCity])

  const countryItems = React.useMemo(() => {
    const base = COUNTRY_NAMES
    const v = (c.shootingCountry ?? "").trim()
    const input = countryInputValue?.trim()
    const extra = [v, input].filter(Boolean).filter((x) => !base.includes(x))
    const uniqExtra = [...new Set(extra)]
    const combined = uniqExtra.length ? [...base, ...uniqExtra] : base
    return [...new Set(combined)]
  }, [c.shootingCountry, countryInputValue])

  const cityItems = React.useMemo(() => {
    const baseRaw = (c.shootingCountry ?? "").trim()
      ? getCitiesByCountryName(c.shootingCountry!)
      : []
    const base = [...new Set(baseRaw)]
    const v = (c.shootingCity ?? "").trim()
    const input = cityInputValue?.trim()
    const extra = [v, input].filter(Boolean).filter((x) => !base.includes(x))
    const uniqExtra = [...new Set(extra)]
    const combined = uniqExtra.length ? [...base, ...uniqExtra] : base
    return [...new Set(combined)]
  }, [c.shootingCountry, c.shootingCity, cityInputValue])

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
              <FieldLabel htmlFor={`${baseId}-shooting-street-address`}>Street address</FieldLabel>
              <FieldContent>
                <Input
                  id={`${baseId}-shooting-street-address`}
                  type="text"
                  value={localStreetAddress}
                  onChange={(e) => {
                    const next = e.target.value
                    setLocalStreetAddress(next)
                    onShootingSetupChange({
                      shootingStreetAddress: next || undefined,
                    })
                  }}
                  onFocus={() => setStreetFocused(true)}
                  onBlur={() => setStreetFocused(false)}
                  placeholder="Carrer o Pinado, 25"
                  className="w-full"
                />
              </FieldContent>
            </Field>
          </RowVariants>
          <RowVariants variant="3">
            <Field>
              <FieldLabel htmlFor={`${baseId}-shooting-zip-code`}>ZIP code</FieldLabel>
              <FieldContent>
                <Input
                  id={`${baseId}-shooting-zip-code`}
                  type="text"
                  value={localZipCode}
                  onChange={(e) => {
                    const next = e.target.value
                    setLocalZipCode(next)
                    onShootingSetupChange({
                      shootingZipCode: next || undefined,
                    })
                  }}
                  onFocus={() => setZipFocused(true)}
                  onBlur={() => setZipFocused(false)}
                  placeholder="01293"
                  className="w-full"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${baseId}-shooting-country`}>Country</FieldLabel>
              <FieldContent>
                <Combobox
                  items={countryItems}
                  value={countryOpen ? countryInputValue : (c.shootingCountry ?? "")}
                  onValueChange={(value) => {
                    const next = value || ""
                    selectedCountryRef.current = next
                    setCountryInputValue(next)
                    onShootingSetupChange({ shootingCountry: next || undefined })
                  }}
                  inputValue={countryInputValue}
                  onInputValueChange={(v) => setCountryInputValue(v)}
                  open={countryOpen}
                  onOpenChange={(open) => {
                    setCountryOpen(open)
                    if (open) {
                      setCountryInputValue(c.shootingCountry ?? "")
                      selectedCountryRef.current = null
                    } else {
                      const toSave = selectedCountryRef.current ?? (countryInputValue?.trim() || "")
                      selectedCountryRef.current = null
                      setCountryInputValue(toSave)
                      onShootingSetupChange({ shootingCountry: toSave || undefined })
                    }
                  }}
                >
                  <ComboboxInput
                    id={`${baseId}-shooting-country`}
                    placeholder="Select or type country"
                    showClear={!!c.shootingCountry}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No country found. You can type your own.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${baseId}-shooting-city`}>City</FieldLabel>
              <FieldContent>
                <Combobox
                  items={cityItems}
                  value={cityOpen ? cityInputValue : (c.shootingCity ?? "")}
                  onValueChange={(value) => {
                    const next = value || ""
                    selectedCityRef.current = next
                    setCityInputValue(next)
                    onShootingSetupChange({ shootingCity: next || undefined })
                  }}
                  inputValue={cityInputValue}
                  onInputValueChange={(v) => setCityInputValue(v)}
                  open={cityOpen}
                  onOpenChange={(open) => {
                    setCityOpen(open)
                    if (open) {
                      setCityInputValue(c.shootingCity ?? "")
                      selectedCityRef.current = null
                    } else {
                      const toSave = selectedCityRef.current ?? (cityInputValue?.trim() || "")
                      selectedCityRef.current = null
                      setCityInputValue(toSave)
                      onShootingSetupChange({ shootingCity: toSave || undefined })
                    }
                  }}
                >
                  <ComboboxInput
                    id={`${baseId}-shooting-city`}
                    placeholder={(c.shootingCountry ?? "").trim() ? "Select or type city" : "Select country first"}
                    showClear={!!c.shootingCity}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>
                      {(c.shootingCountry ?? "").trim() ? "No city found. You can type your own." : "Select a country first."}
                    </ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </FieldContent>
            </Field>
          </RowVariants>
        </div>
      </FieldGroup>
    </div>
  )
}
