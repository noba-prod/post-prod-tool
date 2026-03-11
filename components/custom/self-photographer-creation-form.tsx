"use client"

import * as React from "react"
import { ModalWindow } from "./modal-window"
import { Layout, LayoutSection } from "./layout"
import { RowVariants } from "./row-variants"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "./phone-input"
import { Textarea } from "@/components/ui/textarea"
import { ProfilePictureUpload } from "./profile-picture-upload"

// Import domain types
import { entityTypeToLabel, roleToLabel } from "@/lib/types"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Form data for self-photographer creation.
 */
export interface SelfPhotographerFormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  countryCode: string
  profilePicture: File | null
  notes: string
}

interface SelfPhotographerCreationFormProps {
  /** Whether the modal is open */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Initial form data */
  initialData?: Partial<SelfPhotographerFormData>
  /** Callback when form is submitted */
  onSubmit?: (data: SelfPhotographerFormData) => void
  /** Callback when form is cancelled */
  onCancel?: () => void
  /** Whether form is submitting */
  isSubmitting?: boolean
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Self-Photographer Creation Form Component
 * 
 * A modal form for creating a self-photographer entity.
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
 * 
 * ## Side Effects
 * Creating a Self-Photographer implicitly creates:
 * - The Entity (Self-Photographer)
 * - The associated Admin User
 */
export function SelfPhotographerCreationForm({
  open = false,
  onOpenChange,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SelfPhotographerCreationFormProps) {
  // Form state
  const [formData, setFormData] = React.useState<SelfPhotographerFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    countryCode: initialData?.countryCode || "+34",
    profilePicture: initialData?.profilePicture ?? null,
    notes: initialData?.notes || "",
  })

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        firstName: initialData?.firstName || "",
        lastName: initialData?.lastName || "",
        email: initialData?.email || "",
        phoneNumber: initialData?.phoneNumber || "",
        countryCode: initialData?.countryCode || "+34",
        profilePicture: initialData?.profilePicture ?? null,
        notes: initialData?.notes || "",
      })
    }
  }, [open, initialData])

  // Validation
  const isFormValid = React.useMemo(() => {
    return (
      formData.firstName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phoneNumber.trim() !== ""
    )
  }, [formData])

  // Handlers
  const handleSubmit = () => {
    if (isFormValid && onSubmit && !isSubmitting) {
      onSubmit(formData)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <ModalWindow
      open={open}
      onOpenChange={onOpenChange}
      title="Create Photographer"
      subtitle="Create a new photographer entity and its admin user"
      primaryLabel={isSubmitting ? "Creating..." : "Create photographer"}
      secondaryLabel="Cancel"
      showSecondary={false}
      primaryDisabled={!isFormValid || isSubmitting}
      onPrimaryClick={handleSubmit}
      onSecondaryClick={handleCancel}
      width="644px"
    >
      <Layout padding="md" showSeparators={false}>
        <LayoutSection>
          <FieldGroup>
            {/* Row 1: First Name | Last Name */}
            <RowVariants variant="2">
              {/* First Name */}
              <Field>
                <FieldLabel htmlFor="sp-first-name">
                  First Name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="sp-first-name"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="Write name"
                    required
                  />
                </FieldContent>
              </Field>

              {/* Last Name */}
              <Field>
                <FieldLabel htmlFor="sp-last-name">Last name</FieldLabel>
                <FieldContent>
                  <Input
                    id="sp-last-name"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Write last name"
                  />
                </FieldContent>
              </Field>
            </RowVariants>

            {/* Row 2: Email | Phone Number */}
            <RowVariants variant="2">
              {/* Email */}
              <Field>
                <FieldLabel htmlFor="sp-email">
                  Email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="sp-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Write email address"
                    required
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
                      setFormData((prev) => ({ ...prev, countryCode: code }))
                    }
                    onPhoneNumberChange={(number) =>
                      setFormData((prev) => ({ ...prev, phoneNumber: number }))
                    }
                    placeholder="649 393 291"
                  />
                </FieldContent>
              </Field>
            </RowVariants>

            {/* Row 3: Entity Type (disabled) | Role (disabled) */}
            <RowVariants variant="2">
              {/* Entity Type (fixed to Photographer) */}
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

            {/* Row 4: Profile Picture */}
            <RowVariants variant="1">
              <Field>
                <FieldContent>
                  <ProfilePictureUpload
                    id="sp-profile-picture"
                    label="Profile picture"
                    value={formData.profilePicture}
                    onChange={(file) =>
                      setFormData((prev) => ({ ...prev, profilePicture: file }))
                    }
                  />
                </FieldContent>
              </Field>
            </RowVariants>

            {/* Row 5: Notes */}
            <RowVariants variant="1">
              <Field>
                <FieldLabel htmlFor="sp-notes">
                  Notes
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="sp-notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Add any relevant notes about this photographer"
                    className="min-h-24"
                  />
                </FieldContent>
              </Field>
            </RowVariants>
          </FieldGroup>
        </LayoutSection>
      </Layout>
    </ModalWindow>
  )
}

export type { SelfPhotographerCreationFormProps }
