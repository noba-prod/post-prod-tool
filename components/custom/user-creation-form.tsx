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
import type { Role, EntityType, User } from "@/lib/types"
import { roleToLabel, entityTypeToLabel, ALL_ROLES } from "@/lib/types"
import { parsePhoneNumber } from "@/lib/utils/form-mappers"

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
  /** Form mode: 'create' for new users, 'edit' for editing existing users */
  mode?: "create" | "edit"
  /** Initial user data (for edit mode) */
  initialUserData?: User
  /** Initial form data */
  initialData?: Partial<UserFormData>
  /** Whether all fields should be disabled (for view-only mode) */
  disabled?: boolean
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
  mode = "create",
  initialUserData,
  initialData,
  disabled = false,
  onSubmit,
  onCancel,
  primaryLabel,
  secondaryLabel = "Cancel",
}: UserCreationFormProps) {
  // Determine title and primary label based on mode
  const title = mode === "edit" ? "Edit user" : (isAdminUser ? "New Admin User" : "Create User")
  const defaultPrimaryLabel = mode === "edit" ? "Save changes" : (isAdminUser ? "Create admin user" : "Register member")
  const finalPrimaryLabel = primaryLabel || defaultPrimaryLabel

  // Parse initialUserData if provided (for edit mode)
  const parsedInitialData = React.useMemo(() => {
    if (initialUserData && entity) {
      const { countryCode, phoneNumber } = parsePhoneNumber(initialUserData.phoneNumber)
      return {
        firstName: initialUserData.firstName,
        lastName: initialUserData.lastName || "",
        email: initialUserData.email,
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        entity: { type: entity.type, name: entity.name },
        role: initialUserData.role,
      }
    }
    return initialData
  }, [initialUserData, entity, initialData])

  // Form state - uses domain Role values
  const [formData, setFormData] = React.useState<UserFormData>({
    firstName: parsedInitialData?.firstName || "",
    lastName: parsedInitialData?.lastName || "",
    email: parsedInitialData?.email || "",
    phoneNumber: parsedInitialData?.phoneNumber || "",
    countryCode: parsedInitialData?.countryCode || "+34",
    entity: entity || parsedInitialData?.entity || null,
    role: isAdminUser ? "admin" : (parsedInitialData?.role || "viewer"),
  })

  // Update form data when entity prop changes
  React.useEffect(() => {
    if (entity) {
      setFormData((prev) => ({ ...prev, entity }))
    }
  }, [entity])

  // Update form data when initialUserData changes (for edit mode)
  React.useEffect(() => {
    if (mode === "edit" && initialUserData && entity) {
      const { countryCode, phoneNumber } = parsePhoneNumber(initialUserData.phoneNumber)
      setFormData({
        firstName: initialUserData.firstName,
        lastName: initialUserData.lastName || "",
        email: initialUserData.email,
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        entity: { type: entity.type, name: entity.name },
        role: initialUserData.role,
      })
    }
  }, [mode, initialUserData, entity])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      if (mode === "edit" && initialUserData && entity) {
        const { countryCode, phoneNumber } = parsePhoneNumber(initialUserData.phoneNumber)
        setFormData({
          firstName: initialUserData.firstName,
          lastName: initialUserData.lastName || "",
          email: initialUserData.email,
          phoneNumber: phoneNumber,
          countryCode: countryCode,
          entity: { type: entity.type, name: entity.name },
          role: initialUserData.role,
        })
      } else {
        setFormData({
          firstName: parsedInitialData?.firstName || "",
          lastName: parsedInitialData?.lastName || "",
          email: parsedInitialData?.email || "",
          phoneNumber: parsedInitialData?.phoneNumber || "",
          countryCode: parsedInitialData?.countryCode || "+34",
          entity: entity || parsedInitialData?.entity || null,
          role: isAdminUser ? "admin" : (parsedInitialData?.role || "viewer"),
        })
      }
    }
  }, [open, entity, isAdminUser, parsedInitialData, mode, initialUserData])

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
      title={title}
      subtitle={
        mode === "edit"
          ? "Update user information"
          : isAdminUser
          ? "Create the admin user for this entity"
          : "Add a new member to the entity"
      }
      primaryLabel={finalPrimaryLabel}
      secondaryLabel={secondaryLabel}
      showSecondary={false}
      primaryDisabled={!isFormValid || disabled}
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
                    disabled={disabled}
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
                    disabled={disabled}
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
                    disabled={disabled || mode === "edit"}
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
                    disabled={disabled}
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
                    disabled={true || disabled}
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
                    disabled={isAdminUser || disabled || mode === "edit"}
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
