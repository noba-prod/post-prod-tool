"use client"

import * as React from "react"
import { ModalWindow } from "./modal-window"
import { Layout, LayoutSection } from "./layout"
import { RowVariants } from "./row-variants"
import { Field, FieldGroup, FieldLabel, FieldContent } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "./phone-input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Import domain types and helpers
import type { Role, EntityType } from "@/lib/types"
import { roleToLabel, entityTypeToLabel, ALL_ROLES } from "@/lib/types"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entity reference for the user form.
 * Uses domain EntityType value.
 */
interface Entity {
  type: EntityType
  name: string
}

/**
 * Form data structure for user creation.
 * Uses domain Role values (lowercase).
 */
interface UserFormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  countryCode: string
  entity: Entity | null
  /** Role - uses domain value (e.g., "admin", "editor", "viewer") */
  role: Role
}

interface UserCreationFormProps {
  /** Whether the modal is open */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Entity data (prefilled and disabled in "New Admin User" variant) */
  entity?: Entity | null
  /** Whether this is the "New Admin User" variant */
  isAdminUser?: boolean
  /** Initial form data */
  initialData?: Partial<UserFormData>
  /** Callback when form is submitted */
  onSubmit?: (data: UserFormData) => void
  /** Callback when form is cancelled */
  onCancel?: () => void
  /** Primary action label */
  primaryLabel?: string
  /** Secondary action label */
  secondaryLabel?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * User Creation Form Component
 * 
 * A reusable form for creating users, supporting both:
 * - "Create User" (general user creation)
 * - "New Admin User" (variant with Entity prefilled/disabled and Role fixed to Admin)
 * 
 * Uses ModalWindow structure with Layout for form fields.
 * 
 * ## Form Fields
 * - First Name (text input, mandatory)
 * - Last Name (text input)
 * - Email (email input, mandatory)
 * - Phone Number (phone input, mandatory)
 * - Entity (select disabled, shows "EntityType: EntityName", mandatory)
 * - Role (select: Admin | Editor | Viewer, mandatory)
 * 
 * ## Variants
 * - **Create User**: All fields editable, Entity must be selected
 * - **New Admin User**: Entity prefilled/disabled, Role fixed to "Admin" and disabled
 */
export function UserCreationForm({
  open = false,
  onOpenChange,
  entity = null,
  isAdminUser = false,
  initialData,
  onSubmit,
  onCancel,
  primaryLabel = "Register member",
  secondaryLabel = "Cancel",
}: UserCreationFormProps) {
  // Form state - uses domain Role values
  const [formData, setFormData] = React.useState<UserFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    countryCode: initialData?.countryCode || "+34",
    entity: entity || initialData?.entity || null,
    role: isAdminUser ? "admin" : (initialData?.role || "viewer"),
  })

  // Update form data when entity prop changes
  React.useEffect(() => {
    if (entity) {
      setFormData((prev) => ({ ...prev, entity }))
    }
  }, [entity])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setFormData({
        firstName: initialData?.firstName || "",
        lastName: initialData?.lastName || "",
        email: initialData?.email || "",
        phoneNumber: initialData?.phoneNumber || "",
        countryCode: initialData?.countryCode || "+34",
        entity: entity || initialData?.entity || null,
        role: isAdminUser ? "admin" : (initialData?.role || "viewer"),
      })
    }
  }, [open, entity, isAdminUser, initialData])

  // Validation
  const isFormValid = React.useMemo(() => {
    return (
      formData.firstName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.phoneNumber.trim() !== "" &&
      formData.entity !== null &&
      formData.role !== null
    )
  }, [formData])

  // Handlers
  const handleSubmit = () => {
    if (isFormValid && onSubmit) {
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
      title={isAdminUser ? "New Admin User" : "Create User"}
      subtitle={
        isAdminUser
          ? "Create the admin user for this entity"
          : "Add a new member to the entity"
      }
      primaryLabel={isAdminUser ? "Create admin user" : primaryLabel}
      secondaryLabel={secondaryLabel}
      showSecondary={false}
      primaryDisabled={!isFormValid}
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
                <FieldLabel htmlFor="user-first-name">
                  First Name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="user-first-name"
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
                <FieldLabel htmlFor="user-last-name">Last name</FieldLabel>
                <FieldContent>
                  <Input
                    id="user-last-name"
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
                <FieldLabel htmlFor="user-email">
                  Email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="user-email"
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

            {/* Row 3: Entity | Role */}
            <RowVariants variant="2">
              {/* Entity (disabled select) */}
              <Field>
                <FieldLabel htmlFor="user-entity" disabled={true}>
                  {formData.entity ? entityTypeToLabel(formData.entity.type) : "Entity"}
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={formData.entity ? "selected" : ""}
                    disabled={true}
                  >
                    <SelectTrigger id="user-entity" className="w-full">
                      <SelectValue
                        placeholder={
                          formData.entity
                            ? formData.entity.name
                            : "Entity will be selected from context"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="selected">
                          {formData.entity?.name || "No entity selected"}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              {/* Role */}
              <Field>
                <FieldLabel htmlFor="user-role" disabled={isAdminUser}>
                  Role
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={formData.role}
                    onValueChange={(value: Role) =>
                      setFormData((prev) => ({ ...prev, role: value }))
                    }
                    disabled={isAdminUser}
                  >
                    <SelectTrigger id="user-role" className="w-full">
                      <SelectValue placeholder="Select a role">
                        {roleToLabel(formData.role)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ALL_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleToLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </RowVariants>
          </FieldGroup>
        </LayoutSection>
      </Layout>
    </ModalWindow>
  )
}

export type {
  UserCreationFormProps,
  UserFormData,
  Entity,
}

// Re-export domain types for convenience
export type { Role, EntityType } from "@/lib/types"
