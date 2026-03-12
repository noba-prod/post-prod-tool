"use client"

import * as React from "react"
import { ModalWindow } from "./modal-window"
import { Layout, LayoutSection } from "./layout"
import { RowVariants } from "./row-variants"
import { Field, FieldGroup, FieldLabel, FieldContent, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PhoneInput } from "./phone-input"
import { OptionPicker } from "./option-picker"
import { ProfilePictureUpload } from "./profile-picture-upload"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Import domain types and helpers
import type { Role, EntityType, User } from "@/lib/types"
import { roleToLabel, entityTypeToLabel, SELECTABLE_ROLES } from "@/lib/types"
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
  /** Profile picture file (for upload) */
  profilePicture?: File | null
  /** True when user explicitly removed the existing profile picture (edit mode) */
  profilePictureRemoved?: boolean
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
  /** When true, user is editing their own profile (Profile details): different title/subtitle and Role field disabled */
  isEditingSelf?: boolean
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
  /** Callback when Delete is clicked (shows Delete as secondary destructive button; admin only) */
  onDeleteClick?: () => void
  /** Primary action label */
  primaryLabel?: string
  /** Secondary action label */
  secondaryLabel?: string
  /** Show primary button (default: true when not disabled, false when view-only) */
  showPrimary?: boolean
  /** Show secondary button (default: false; set true for Cancel in edit mode, or Delete when onDeleteClick) */
  showSecondary?: boolean
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
 * - Phone Number (phone input, optional)
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
  isEditingSelf = false,
  initialUserData,
  initialData,
  disabled = false,
  onSubmit,
  onCancel,
  onDeleteClick,
  primaryLabel,
  secondaryLabel = "Cancel",
  showPrimary: showPrimaryProp,
  showSecondary: showSecondaryProp,
}: UserCreationFormProps) {
  // Determine title and primary label based on mode (profile-details variant when editing self)
  const title =
    isEditingSelf && mode === "edit"
      ? "Edit profile details"
      : mode === "edit"
        ? "Edit user"
        : isAdminUser
          ? "New Admin User"
          : "Create User"
  const defaultPrimaryLabel = mode === "edit" ? "Save changes" : (isAdminUser ? "Create admin user" : "Register member")
  const finalPrimaryLabel = primaryLabel || defaultPrimaryLabel
  // View-only: hide action buttons; edit mode: show Cancel or Delete (when onDeleteClick) as secondary
  const showPrimary = showPrimaryProp ?? !disabled
  const showSecondary = showSecondaryProp ?? (mode === "edit" && !disabled)
  const useDeleteAsSecondary = Boolean(mode === "edit" && onDeleteClick)
  const finalSecondaryLabel = useDeleteAsSecondary ? "Delete" : (secondaryLabel ?? "Cancel")
  const secondaryVariant = useDeleteAsSecondary ? "destructive" : "default"

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
        profilePicture: null,
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
    role: isAdminUser ? "admin" : (parsedInitialData?.role || "editor"),
    profilePicture: parsedInitialData?.profilePicture ?? null,
  })

  // Update form data when entity prop changes
  React.useEffect(() => {
    if (entity) {
      setFormData((prev) => ({ ...prev, entity }))
    }
  }, [entity])

  // Update form data when initialUserData changes (for edit mode)
  // Preserve profilePicture (selected file) to avoid resetting when user has picked a new file
  React.useEffect(() => {
    if (mode === "edit" && initialUserData && entity) {
      const { countryCode, phoneNumber } = parsePhoneNumber(initialUserData.phoneNumber)
      setFormData((prev) => ({
        firstName: initialUserData.firstName,
        lastName: initialUserData.lastName || "",
        email: initialUserData.email,
        phoneNumber: phoneNumber,
        countryCode: countryCode,
        entity: { type: entity.type, name: entity.name },
        role: initialUserData.role,
        profilePicture: prev.profilePicture instanceof File ? prev.profilePicture : null,
        profilePictureRemoved: prev.profilePicture instanceof File ? false : prev.profilePictureRemoved,
      }))
    }
  }, [mode, initialUserData, entity])

  // Email uniqueness check (create mode, or edit mode when email changed)
  const [emailAlreadyExists, setEmailAlreadyExists] = React.useState(false)
  const emailCheckTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialEmail = initialUserData?.email?.trim().toLowerCase() ?? ""

  React.useEffect(() => {
    if (disabled) {
      setEmailAlreadyExists(false)
      return
    }
    const email = formData.email.trim().toLowerCase()
    if (!email) {
      setEmailAlreadyExists(false)
      return
    }
    // In edit mode: skip check if email unchanged
    if (mode === "edit" && email === initialEmail) {
      setEmailAlreadyExists(false)
      return
    }
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current)
      emailCheckTimeoutRef.current = null
    }
    emailCheckTimeoutRef.current = setTimeout(async () => {
      emailCheckTimeoutRef.current = null
      try {
        const params = new URLSearchParams({ email })
        if (mode === "edit" && initialUserData?.id) {
          params.set("excludeUserId", initialUserData.id)
        }
        const res = await fetch(`/api/users/check-email?${params}`)
        const data = (await res.json()) as { exists?: boolean }
        setEmailAlreadyExists(Boolean(data.exists))
      } catch {
        setEmailAlreadyExists(false)
      }
    }, 400)
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current)
      }
    }
  }, [formData.email, mode, disabled, initialEmail, initialUserData?.id])

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
          profilePicture: null,
          profilePictureRemoved: false,
        })
      } else {
        setFormData({
          firstName: parsedInitialData?.firstName || "",
          lastName: parsedInitialData?.lastName || "",
          email: parsedInitialData?.email || "",
          phoneNumber: parsedInitialData?.phoneNumber || "",
          countryCode: parsedInitialData?.countryCode || "+34",
          entity: entity || parsedInitialData?.entity || null,
          role: isAdminUser ? "admin" : (parsedInitialData?.role || "editor"),
          profilePicture: null,
          profilePictureRemoved: false,
        })
      }
    }
  }, [open, entity, isAdminUser, parsedInitialData, mode, initialUserData])

  // Validation (First Name, Email required; Phone number optional)
  const isFormValid = React.useMemo(() => {
    return (
      formData.firstName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.entity !== null &&
      formData.role !== null &&
      !emailAlreadyExists
    )
  }, [formData, emailAlreadyExists])

  // Email change detection (edit mode only)
  const emailChanged = React.useMemo(() => {
    if (mode !== "edit" || !initialUserData) return false
    return formData.email.trim().toLowerCase() !== initialUserData.email.trim().toLowerCase()
  }, [mode, initialUserData, formData.email])

  // Confirmation dialog for email change (edit mode)
  const [emailChangeConfirmOpen, setEmailChangeConfirmOpen] = React.useState(false)

  const handleSubmit = () => {
    if (!isFormValid || !onSubmit) return
    if (mode === "edit" && emailChanged) {
      setEmailChangeConfirmOpen(true)
    } else {
      onSubmit(formData)
    }
  }

  const handleEmailChangeConfirm = () => {
    setEmailChangeConfirmOpen(false)
    onSubmit?.(formData)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else if (onOpenChange) {
      onOpenChange(false)
    }
  }

  const [userRemovedProfilePicture, setUserRemovedProfilePicture] = React.useState(false)
  React.useEffect(() => {
    if (open) setUserRemovedProfilePicture(false)
  }, [open])

  return (
    <ModalWindow
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={
        isEditingSelf && mode === "edit"
          ? "Update your info and upload a profile picture for better recognition"
          : mode === "edit"
            ? "Update user information"
            : isAdminUser
              ? "Create the admin user for this entity"
              : "Add a new member to the entity"
      }
      primaryLabel={finalPrimaryLabel}
      secondaryLabel={finalSecondaryLabel}
      showPrimary={showPrimary}
      showSecondary={showSecondary}
      secondaryVariant={secondaryVariant}
      primaryDisabled={!isFormValid || disabled}
      onPrimaryClick={handleSubmit}
      onSecondaryClick={useDeleteAsSecondary ? onDeleteClick : handleCancel}
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
              <Field data-invalid={emailAlreadyExists ? "true" : undefined}>
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
                    disabled={disabled}
                    aria-invalid={emailAlreadyExists}
                  />
                  <FieldError>{emailAlreadyExists ? "A user with this email already exists" : null}</FieldError>
                </FieldContent>
              </Field>

              {/* Phone Number (optional) */}
              <Field>
                <FieldContent>
                  <PhoneInput
                    label="Phone number (optional)"
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
              {/* Entity - Option Picker (disabled, single option) */}
              <Field>
                <FieldContent>
                  <OptionPicker
                    label={formData.entity ? entityTypeToLabel(formData.entity.type) : "Organization"}
                    value={formData.entity?.name ?? ""}
                    onValueChange={() => {}}
                    placeholder="Entity will be selected from context"
                    options={
                      formData.entity
                        ? [{ value: formData.entity.name, label: formData.entity.name }]
                        : []
                    }
                    searchable={false}
                    disabled={true}
                  />
                </FieldContent>
              </Field>

              {/* Role - Option Picker (command box without search) */}
              <Field>
                <FieldContent>
                  <OptionPicker
                    label="Role"
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, role: value as Role }))
                    }
                    placeholder="Select a role"
                    options={SELECTABLE_ROLES.map((r) => ({ value: r, label: roleToLabel(r) }))}
                    searchable={false}
                    disabled={isAdminUser || disabled || isEditingSelf}
                  />
                </FieldContent>
              </Field>
            </RowVariants>

            {/* Row 4: Profile Picture Upload */}
            <RowVariants variant="1">
              <Field>
                <FieldContent>
                  <ProfilePictureUpload
                    id="user-profile-picture"
                    label="Profile picture"
                    value={formData.profilePicture}
                    existingUrl={initialUserData?.profilePictureUrl}
                    hideExisting={userRemovedProfilePicture}
                    onChange={(file) => {
                      setFormData((prev) => ({
                        ...prev,
                        profilePicture: file,
                        profilePictureRemoved: !file && Boolean(initialUserData?.profilePictureUrl),
                      }))
                      setUserRemovedProfilePicture(!file)
                    }}
                    disabled={disabled}
                  />
                </FieldContent>
              </Field>
            </RowVariants>
          </FieldGroup>
        </LayoutSection>
      </Layout>

      {/* Email change confirmation dialog */}
      <Dialog open={emailChangeConfirmOpen} onOpenChange={setEmailChangeConfirmOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Confirm email change</DialogTitle>
            <DialogDescription>
              Changing the email will send a confirmation email to the new address. The user will need to confirm it to access their profile with the new email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false} className="sm:justify-end">
            <Button variant="outline" onClick={() => setEmailChangeConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailChangeConfirm}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
