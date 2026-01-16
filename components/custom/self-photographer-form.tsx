"use client"

import * as React from "react"
import { Layout, LayoutSection } from "./layout"
import { RowVariants } from "./row-variants"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "./phone-input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// Import domain types
import { entityTypeToLabel, roleToLabel } from "@/lib/types"
import type { SelfPhotographerFormData } from "./self-photographer-creation-form"

// ============================================================================
// TYPES
// ============================================================================

interface SelfPhotographerFormProps {
  /** Initial form data */
  initialData?: Partial<SelfPhotographerFormData>
  /** Callback when form data changes */
  onDataChange?: (data: SelfPhotographerFormData) => void
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean) => void
  /** Whether all inputs should be disabled (for view-only mode) */
  disabled?: boolean
  /** Additional class name */
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Self-Photographer Form Component
 * 
 * A reusable form for self-photographer entity (without modal wrapper).
 * Can be used in both creation modal and view template.
 * 
 * ## Fixed Fields (disabled)
 * - Entity Type: "Self-Photographer"
 * - Role: "Admin"
 * 
 * ## Editable Fields
 * - First Name (mandatory)
 * - Last Name
 * - Email (mandatory)
 * - Phone Number (mandatory)
 * - Notes
 */
export function SelfPhotographerForm({
  initialData,
  onDataChange,
  onValidationChange,
  disabled = false,
  className,
}: SelfPhotographerFormProps) {
  // Form state
  const [formData, setFormData] = React.useState<SelfPhotographerFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    countryCode: initialData?.countryCode || "+34",
    notes: initialData?.notes || "",
  })

  // Update form when initialData changes (for hydration)
  React.useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        firstName: initialData.firstName ?? prev.firstName,
        lastName: initialData.lastName ?? prev.lastName,
        email: initialData.email ?? prev.email,
        phoneNumber: initialData.phoneNumber ?? prev.phoneNumber,
        countryCode: initialData.countryCode ?? prev.countryCode,
        notes: initialData.notes ?? prev.notes,
      }))
    }
  }, [initialData])

  // Store latest callbacks in refs to avoid dependency issues
  const onDataChangeRef = React.useRef(onDataChange)
  const onValidationChangeRef = React.useRef(onValidationChange)

  React.useLayoutEffect(() => {
    onDataChangeRef.current = onDataChange
    onValidationChangeRef.current = onValidationChange
  }, [onDataChange, onValidationChange])

  // Validation
  const isFormValid = React.useMemo(() => {
    return (
      formData.firstName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phoneNumber.trim() !== ""
    )
  }, [formData])

  // Notify parent of validation changes
  const prevIsFormValidRef = React.useRef<boolean | undefined>(undefined)
  React.useEffect(() => {
    if (prevIsFormValidRef.current !== isFormValid) {
      prevIsFormValidRef.current = isFormValid
      onValidationChangeRef.current?.(isFormValid)
    }
  }, [isFormValid])

  // Notify parent of data changes (after render)
  React.useEffect(() => {
    onDataChangeRef.current?.(formData)
  }, [formData])

  // Helper to update form data
  const updateFormData = React.useCallback(
    (updater: Partial<SelfPhotographerFormData> | ((prev: SelfPhotographerFormData) => SelfPhotographerFormData)) => {
      setFormData((prev) => {
        return typeof updater === "function" ? updater(prev) : { ...prev, ...updater }
      })
    },
    []
  )

  return (
    <Layout padding="none" showSeparators={false} className={className}>
      <LayoutSection>
        <FieldGroup>
          {/* Row 1: First Name | Last Name */}
          <RowVariants variant="2">
            {/* First Name */}
            <Field>
              <FieldLabel htmlFor="sp-first-name" disabled={disabled}>
                First Name
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sp-first-name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    updateFormData({ firstName: e.target.value })
                  }
                  placeholder="Write name"
                  required
                  disabled={disabled}
                  readOnly={disabled}
                />
              </FieldContent>
            </Field>

            {/* Last Name */}
            <Field>
              <FieldLabel htmlFor="sp-last-name" disabled={disabled}>
                Last name
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sp-last-name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) =>
                    updateFormData({ lastName: e.target.value })
                  }
                  placeholder="Write last name"
                  disabled={disabled}
                  readOnly={disabled}
                />
              </FieldContent>
            </Field>
          </RowVariants>

          {/* Row 2: Email | Phone Number */}
          <RowVariants variant="2">
            {/* Email */}
            <Field>
              <FieldLabel htmlFor="sp-email" disabled={disabled}>
                Email
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sp-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    updateFormData({ email: e.target.value })
                  }
                  placeholder="Write email address"
                  required
                  disabled={disabled}
                  readOnly={disabled}
                />
              </FieldContent>
            </Field>

            {/* Phone Number */}
            <Field>
              <FieldContent>
                <PhoneInput
                  label="Phone number"
                  countryCode={formData.countryCode}
                  phoneNumber={formData.phoneNumber}
                  onCountryCodeChange={(code) =>
                    updateFormData({ countryCode: code })
                  }
                  onPhoneNumberChange={(number) =>
                    updateFormData({ phoneNumber: number })
                  }
                  placeholder="649 393 291"
                  disabled={disabled}
                />
              </FieldContent>
            </Field>
          </RowVariants>

          {/* Row 3: Entity Type (disabled) | Role (disabled) */}
          <RowVariants variant="2">
            {/* Entity Type (fixed to Self-Photographer) */}
            <Field>
              <FieldLabel htmlFor="sp-entity-type" disabled={true}>
                Entity type
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sp-entity-type"
                  type="text"
                  value={entityTypeToLabel("self-photographer")}
                  disabled={true}
                  readOnly
                  className="w-full"
                />
              </FieldContent>
            </Field>

            {/* Role (fixed to Admin) */}
            <Field>
              <FieldLabel htmlFor="sp-role" disabled={true}>
                Role
              </FieldLabel>
              <FieldContent>
                <Input
                  id="sp-role"
                  type="text"
                  value={roleToLabel("admin")}
                  disabled={true}
                  readOnly
                  className="w-full"
                />
              </FieldContent>
            </Field>
          </RowVariants>

          {/* Row 4: Notes */}
          <RowVariants variant="1">
            <Field>
              <FieldLabel htmlFor="sp-notes" disabled={disabled}>
                Notes
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="sp-notes"
                  value={formData.notes}
                  onChange={(e) =>
                    updateFormData({ notes: e.target.value })
                  }
                  placeholder="Add any relevant notes about this photographer"
                  className="min-h-24"
                  disabled={disabled}
                  readOnly={disabled}
                />
              </FieldContent>
            </Field>
          </RowVariants>
        </FieldGroup>
      </LayoutSection>
    </Layout>
  )
}

export type { SelfPhotographerFormProps }
