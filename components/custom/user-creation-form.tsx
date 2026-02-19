"use client"

import * as React from "react"
import { ModalWindow } from "./modal-window"
import { Layout, LayoutSection } from "./layout"
import { RowVariants } from "./row-variants"
import { Field, FieldGroup, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "./phone-input"
import { OptionPicker } from "./option-picker"
import { Upload, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
  /** Profile picture file (for upload) */
  profilePicture?: File | null
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
    role: isAdminUser ? "admin" : (parsedInitialData?.role || "viewer"),
    profilePicture: parsedInitialData?.profilePicture ?? null,
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
        profilePicture: null,
      })
    }
  }, [mode, initialUserData, entity])

  // Email uniqueness check (create mode only)
  const [emailAlreadyExists, setEmailAlreadyExists] = React.useState(false)
  const emailCheckTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (mode === "edit" || disabled) {
      setEmailAlreadyExists(false)
      return
    }
    const email = formData.email.trim()
    if (!email) {
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
        const res = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`)
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
  }, [formData.email, mode, disabled])

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
          profilePicture: null,
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

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, profilePicture: file }))
  }
  const handleChooseFileClick = () => {
    fileInputRef.current?.click()
  }

  // Preview URL for profile picture: object URL when new file selected, or existing profile URL
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (formData.profilePicture instanceof File) {
      const url = URL.createObjectURL(formData.profilePicture)
      setObjectUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        setObjectUrl(null)
      }
    }
    setObjectUrl(null)
    return undefined
  }, [formData.profilePicture])
  const [userRemovedProfilePicture, setUserRemovedProfilePicture] = React.useState(false)
  React.useEffect(() => {
    if (open) setUserRemovedProfilePicture(false)
  }, [open])
  const profilePreviewUrl =
    formData.profilePicture instanceof File
      ? objectUrl
      : !userRemovedProfilePicture && (initialUserData?.profilePictureUrl?.trim() || null)
        ? (initialUserData?.profilePictureUrl?.trim() ?? null)
        : null

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
                    disabled={disabled || mode === "edit"}
                    aria-invalid={emailAlreadyExists}
                  />
                  {emailAlreadyExists && (
                    <FieldDescription className="text-xs text-destructive">
                      A user with this email already exists.
                    </FieldDescription>
                  )}
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
                    options={ALL_ROLES.map((r) => ({ value: r, label: roleToLabel(r) }))}
                    searchable={false}
                    disabled={isAdminUser || disabled || isEditingSelf}
                  />
                </FieldContent>
              </Field>
            </RowVariants>

            {/* Row 4: Profile Picture Upload */}
            <RowVariants variant="1">
              <Field>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="user-profile-picture" className={cn("h-3.5 leading-snug w-fit", disabled && "opacity-50")}>
                    Profile picture
                  </Label>
                </div>
                <FieldContent>
                  <div className={cn(
                    "flex items-center gap-1.5 h-9 py-1 px-0.5 border border-border rounded-lg",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}>
                    <Input
                      ref={fileInputRef}
                      id="user-profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={disabled}
                    />
                    {profilePreviewUrl ? (
                      <>
                        <img
                          src={profilePreviewUrl}
                          alt=""
                          className="size-8 shrink-0 rounded-[10px] object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, profilePicture: null }))
                            setUserRemovedProfilePicture(true)
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                          disabled={disabled}
                          className="shrink-0 rounded p-0.5 text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                          aria-label="Remove profile picture"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    ) : null}
                    <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                      {formData.profilePicture
                        ? formData.profilePicture.name
                        : profilePreviewUrl
                          ? ""
                          : "No file chosen"}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="default"
                      className="rounded-lg cursor-pointer h-8 shrink-0"
                      onClick={handleChooseFileClick}
                      disabled={disabled}
                    >
                      <Upload className="size-4 mr-2" />
                      Choose file
                    </Button>
                  </div>
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
