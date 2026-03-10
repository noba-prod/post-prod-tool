"use client"

import * as React from "react"
import { Layout, LayoutSection } from "./layout"
import { RowVariants } from "./row-variants"
import { Titles } from "./titles"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { OptionPicker } from "./option-picker"
import { PhoneInput } from "./phone-input"
import { Textarea } from "@/components/ui/textarea"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ProfilePictureUpload } from "./profile-picture-upload"
import { cn } from "@/lib/utils"

// Import domain types
import type { StandardEntityType } from "@/lib/types"
import { entityTypeToLabel } from "@/lib/types"
import { COUNTRY_NAMES, getCitiesByCountryName } from "@/lib/data/location"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Form data structure for entity basic information.
 * Uses domain EntityType values (lowercase with hyphens).
 */
interface EntityBasicInformationFormData {
  /** Entity type - uses domain value (e.g., "photo-lab") */
  entityType: StandardEntityType
  entityName: string
  streetAddress: string
  zipCode: string
  city: string
  country: string
  email: string
  phoneNumber: string
  countryCode: string
  profilePicture: File | null
  notes: string
}

interface EntityBasicInformationFormProps {
  /** Entity type (auto-selected and disabled) - uses domain value */
  entityType: StandardEntityType
  /** Initial form data */
  initialData?: Partial<EntityBasicInformationFormData>
  /** Callback when form data changes */
  onDataChange?: (data: EntityBasicInformationFormData) => void
  /** Callback when Next button is clicked (handled by BlockTemplate) */
  onNext?: (data: EntityBasicInformationFormData) => void
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean) => void
  /** Whether location block should be shown (false for Client) */
  showLocation?: boolean
  /** Whether form is valid (for external control) */
  isValid?: boolean
  /** Whether all inputs should be disabled (for view-only mode) */
  disabled?: boolean
  /** Existing profile picture URL (when editing, for preview) */
  existingProfilePictureUrl?: string | null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Entity Basic Information Form Component
 * 
 * Step 1 form for creating standard entities (Client, Agency, Photo Lab, etc.)
 * 
 * ## Blocks
 * 1. Entity Details (mandatory)
 *    - Entity Type (disabled, auto-selected)
 *    - Entity Name
 * 
 * 2. Location (mandatory for Photo Lab, Retouch/Post Studio, Hand Print Lab; not shown for Agency)
 *    - Street Address
 *    - ZIP Code
 *    - City (combobox)
 *    - Country (combobox)
 * 
 * 3. Additional Information (optional, always visible)
 *    - Profile Picture upload (Email and Phone hidden for client, hand-print-lab, photo-lab, agency, retouch/post studio)
 *    - Notes
 * 
 * ## Layout
 * - Uses Layout with LayoutSection
 * - Blocks separated by Separator
 * - RowVariants for field organization
 */
export function EntityBasicInformationForm({
  entityType,
  initialData,
  onDataChange,
  onNext,
  onValidationChange,
  showLocation = true,
  isValid: externalIsValid,
  disabled = false,
  existingProfilePictureUrl,
}: EntityBasicInformationFormProps) {
  // Form state
  const [formData, setFormData] = React.useState<EntityBasicInformationFormData>({
    entityType,
    entityName: initialData?.entityName || "",
    streetAddress: initialData?.streetAddress || "",
    zipCode: initialData?.zipCode || "",
    city: initialData?.city || "",
    country: initialData?.country || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    countryCode: initialData?.countryCode || "+34",
    profilePicture: initialData?.profilePicture || null,
    notes: initialData?.notes || "",
  })

  // Input value for country/city comboboxes when open (for "accept custom on close")
  const [countryInputValue, setCountryInputValue] = React.useState(initialData?.country ?? "")
  const [cityInputValue, setCityInputValue] = React.useState(initialData?.city ?? "")
  // Track open state so we pass value = input while open (avoids combobox resetting input from value)
  const [countryOpen, setCountryOpen] = React.useState(false)
  const [cityOpen, setCityOpen] = React.useState(false)
  // Ref to capture selection on close (onOpenChange can run before setState from onValueChange commits)
  const selectedCountryRef = React.useRef<string | null>(null)
  const selectedCityRef = React.useRef<string | null>(null)

  // When popup is closed, show saved country/city from form (so loaded Supabase data displays correctly)
  React.useEffect(() => {
    if (!countryOpen) setCountryInputValue(formData.country ?? "")
  }, [countryOpen, formData.country])

  React.useEffect(() => {
    if (!cityOpen) setCityInputValue(formData.city ?? "")
  }, [cityOpen, formData.city])

  // Store latest callbacks in refs to avoid dependency issues
  const onDataChangeRef = React.useRef(onDataChange)
  const onValidationChangeRef = React.useRef(onValidationChange)
  
  // Keep refs updated without triggering effects
  React.useLayoutEffect(() => {
    onDataChangeRef.current = onDataChange
    onValidationChangeRef.current = onValidationChange
  })

  // Validation - computed from form data
  const isFormValid = React.useMemo(() => {
    if (externalIsValid !== undefined) return externalIsValid
    const baseValid = formData.entityName.trim() !== ""
    if (showLocation) {
      return (
        baseValid &&
        formData.streetAddress.trim() !== "" &&
        formData.zipCode.trim() !== "" &&
        formData.city.trim() !== "" &&
        formData.country.trim() !== ""
      )
    }
    return baseValid
  }, [formData.entityName, formData.streetAddress, formData.zipCode, formData.city, formData.country, showLocation, externalIsValid])

  // Track previous validation state to avoid redundant calls
  const prevIsFormValidRef = React.useRef<boolean | undefined>(undefined)
  
  // Notify parent of validation changes (only when value actually changes)
  React.useEffect(() => {
    if (prevIsFormValidRef.current !== isFormValid) {
      prevIsFormValidRef.current = isFormValid
      onValidationChangeRef.current?.(isFormValid)
    }
  }, [isFormValid])

  // Track if this is the initial mount to skip first onDataChange call
  const isInitialMountRef = React.useRef(true)
  
  // Notify parent of data changes (after render, not during setState)
  React.useEffect(() => {
    // Skip initial mount to avoid calling onDataChange with initial state
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      // Still notify parent of initial data
      onDataChangeRef.current?.(formData)
      return
    }
    onDataChangeRef.current?.(formData)
  }, [formData])

  /**
   * Helper to update form data.
   * Parent notification happens via useEffect after render.
   */
  const updateFormData = React.useCallback(
    (updater: Partial<EntityBasicInformationFormData> | ((prev: EntityBasicInformationFormData) => EntityBasicInformationFormData)) => {
      setFormData((prev) => {
        return typeof updater === "function" ? updater(prev) : { ...prev, ...updater }
      })
    },
    []
  )

  // Country list: full list + current value and current input when open (so value is always in items). Dedupe so keys are unique.
  const countryItems = React.useMemo(() => {
    const base = COUNTRY_NAMES
    const v = formData.country?.trim()
    const input = countryInputValue?.trim()
    const extra = [v, input].filter(Boolean).filter((x) => !base.includes(x))
    const uniqExtra = [...new Set(extra)]
    const combined = uniqExtra.length ? [...base, ...uniqExtra] : base
    return [...new Set(combined)]
  }, [formData.country, countryInputValue])

  // City list: cities for selected country + current value and current input when open. Dedupe (data can have same name in different states).
  const cityItems = React.useMemo(() => {
    const baseRaw = formData.country?.trim()
      ? getCitiesByCountryName(formData.country)
      : []
    const base = [...new Set(baseRaw)]
    const v = formData.city?.trim()
    const input = cityInputValue?.trim()
    const extra = [v, input].filter(Boolean).filter((x) => !base.includes(x))
    const uniqExtra = [...new Set(extra)]
    const combined = uniqExtra.length ? [...base, ...uniqExtra] : base
    return [...new Set(combined)]
  }, [formData.country, formData.city, cityInputValue])

  return (
    <Layout padding="none" showSeparators={false}>
      <LayoutSection>
        <FieldGroup>
          {/* Block 1: Entity Details */}
          <div className="flex flex-col gap-4 w-full">
            <Titles type="form" title="Entity details" showSubtitle={false} />
            <RowVariants variant="2">
              {/* Entity Type - OptionPicker (disabled, single option) */}
              <Field>
                <FieldContent>
                  <OptionPicker
                    label="Entity type"
                    value={entityType}
                    onValueChange={() => {}}
                    placeholder="Entity type"
                    options={[
                      {
                        value: entityType,
                        label: entityTypeToLabel(entityType),
                      },
                    ]}
                    searchable={false}
                    disabled={true}
                  />
                </FieldContent>
              </Field>

              {/* Entity Name */}
              <Field>
                <FieldLabel htmlFor="entity-name" disabled={disabled}>
                  Name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="entity-name"
                    type="text"
                    value={formData.entityName}
                    onChange={(e) => updateFormData({ entityName: e.target.value })}
                    placeholder={`Write the name of the ${(entityTypeToLabel(entityType) ?? "entity").toLowerCase()}...`}
                    required
                    disabled={disabled}
                    readOnly={disabled}
                  />
                </FieldContent>
              </Field>
            </RowVariants>
          </div>

          {/* Block 2: Location (only if showLocation is true) */}
          {showLocation && (
            <div className="flex flex-col gap-4 w-full">
              <Titles type="form" title="Location" showSubtitle={false} />
              {/* Street Address (full width) */}
              <RowVariants variant="1">
                <Field>
                  <FieldLabel htmlFor="street-address" disabled={disabled}>
                    Street address
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="street-address"
                      type="text"
                      value={formData.streetAddress}
                      onChange={(e) => updateFormData({ streetAddress: e.target.value })}
                      placeholder="Complete the address, number and all relevant infomation"
                      required
                      disabled={disabled}
                      readOnly={disabled}
                    />
                  </FieldContent>
                </Field>
              </RowVariants>

              {/* ZIP Code, Country, City (3 columns) */}
              <RowVariants variant="3">
                {/* ZIP Code */}
                <Field>
                  <FieldLabel htmlFor="zip-code" disabled={disabled}>
                    ZIP code
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="zip-code"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => updateFormData({ zipCode: e.target.value })}
                      placeholder={`Complete the address of the ${(entityTypeToLabel(entityType) ?? "entity").toLowerCase()}`}
                      required
                      disabled={disabled}
                      readOnly={disabled}
                    />
                  </FieldContent>
                </Field>

                {/* Country (combobox) - full list; custom value accepted on close */}
                <Field>
                  <FieldLabel htmlFor="country" disabled={disabled}>
                    Country
                  </FieldLabel>
                  <FieldContent>
                    <Combobox
                      items={countryItems}
                      value={countryOpen ? countryInputValue : formData.country}
                      onValueChange={(value) => {
                        const next = value || ""
                        selectedCountryRef.current = next
                        setCountryInputValue(next)
                        updateFormData({ country: next })
                      }}
                      inputValue={countryInputValue}
                      onInputValueChange={(v) => setCountryInputValue(v)}
                      open={countryOpen}
                      onOpenChange={(open) => {
                        setCountryOpen(open)
                        if (open) {
                          setCountryInputValue(formData.country)
                          selectedCountryRef.current = null
                        } else {
                          const toSave = selectedCountryRef.current ?? (countryInputValue?.trim() || "")
                          selectedCountryRef.current = null
                          setCountryInputValue(toSave)
                          updateFormData({ country: toSave })
                        }
                      }}
                      disabled={disabled}
                    >
                      <ComboboxInput
                        id="country"
                        placeholder="Select or type country"
                        showClear={!!formData.country && !disabled}
                        disabled={disabled}
                      />
                      {!disabled && (
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
                      )}
                    </Combobox>
                  </FieldContent>
                </Field>

                {/* City (combobox) - list by country; custom value accepted on close */}
                <Field>
                  <FieldLabel htmlFor="city" disabled={disabled}>
                    City
                  </FieldLabel>
                  <FieldContent>
                    <Combobox
                      items={cityItems}
                      value={cityOpen ? cityInputValue : formData.city}
                      onValueChange={(value) => {
                        const next = value || ""
                        selectedCityRef.current = next
                        setCityInputValue(next)
                        updateFormData({ city: next })
                      }}
                      inputValue={cityInputValue}
                      onInputValueChange={(v) => setCityInputValue(v)}
                      open={cityOpen}
                      onOpenChange={(open) => {
                        setCityOpen(open)
                        if (open) {
                          setCityInputValue(formData.city)
                          selectedCityRef.current = null
                        } else {
                          const toSave = selectedCityRef.current ?? (cityInputValue?.trim() || "")
                          selectedCityRef.current = null
                          setCityInputValue(toSave)
                          updateFormData({ city: toSave })
                        }
                      }}
                      disabled={disabled}
                    >
                      <ComboboxInput
                        id="city"
                        placeholder={formData.country ? "Select or type city" : "Select country first"}
                        showClear={!!formData.city && !disabled}
                        disabled={disabled}
                      />
                      {!disabled && (
                        <ComboboxContent>
                          <ComboboxEmpty>
                            {formData.country ? "No city found. You can type your own." : "Select a country first."}
                          </ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      )}
                    </Combobox>
                  </FieldContent>
                </Field>
              </RowVariants>
            </div>
          )}
        </FieldGroup>

        {/* Separator before Additional Information */}
        <Separator className="my-0" />

        {/* Block 3: Additional Information */}
        <div className="flex flex-col gap-5 w-full">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-foreground">
              Additional information
            </h3>
            <p className="text-sm text-muted-foreground">
              This data is optional and intended for informational purposes only; any communications will be directed to this data.
            </p>
          </div>

          {/* Fields */}
          <FieldGroup>
            {/* Upload profile picture only (Email and Phone hidden for client, hand-print-lab, photo-lab, agency, retouch/post studio) */}
            <RowVariants variant="1">
              <Field>
                <FieldContent>
                  <ProfilePictureUpload
                    id="entity-profile-picture"
                    label="Upload profile picture"
                    value={formData.profilePicture}
                    existingUrl={existingProfilePictureUrl}
                    onChange={(file) => updateFormData({ profilePicture: file })}
                    disabled={disabled}
                  />
                </FieldContent>
              </Field>
            </RowVariants>

            {/* Second Row: Notes (1 column) */}
            <RowVariants variant="1">
              <Field>
                <FieldLabel htmlFor="entity-notes" disabled={disabled}>
                  Notes
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="entity-notes"
                    value={formData.notes}
                    onChange={(e) => updateFormData({ notes: e.target.value })}
                    placeholder="Add any descriptive information relevant for your workflow"
                    className="min-h-24"
                    disabled={disabled}
                    readOnly={disabled}
                  />
                </FieldContent>
              </Field>
            </RowVariants>
          </FieldGroup>
        </div>
      </LayoutSection>
    </Layout>
  )
}

export type {
  EntityBasicInformationFormProps,
  EntityBasicInformationFormData,
}

// Re-export domain type for convenience
export type { StandardEntityType as EntityType } from "@/lib/types"
