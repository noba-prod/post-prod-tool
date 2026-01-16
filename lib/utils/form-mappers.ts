/**
 * Utilities to convert between UI form data types and service payload types.
 * 
 * Since UI forms now use domain types directly, these mappers are mostly
 * identity functions with some field reorganization.
 */

import type {
  StandardEntityType,
  CreateEntityDraftPayload,
  CreateUserPayload,
  Location,
  Role,
} from "@/lib/types"

// =============================================================================
// UI FORM DATA TYPES (from components)
// =============================================================================

/**
 * Form data type from EntityBasicInformationForm component.
 * Uses domain StandardEntityType values.
 */
export interface EntityBasicInformationFormData {
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

/**
 * Form data type from UserCreationForm component.
 * Uses domain Role values.
 */
export interface UserFormData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  countryCode: string
  entity: { type: StandardEntityType; name: string } | null
  role: Role
}

// =============================================================================
// MAPPERS
// =============================================================================

/**
 * Converts EntityBasicInformationFormData to CreateEntityDraftPayload.
 * 
 * Since UI now uses domain types, this is mostly field reorganization:
 * - Combines location fields into Location object
 * - Combines phone fields
 * - Drops profilePicture (would need upload handling)
 */
export function mapFormToEntityDraft(
  formData: EntityBasicInformationFormData
): CreateEntityDraftPayload {
  // Build location if any location field is filled
  let location: Location | undefined
  if (
    formData.streetAddress.trim() ||
    formData.zipCode.trim() ||
    formData.city.trim() ||
    formData.country.trim()
  ) {
    location = {
      streetAddress: formData.streetAddress.trim(),
      zipCode: formData.zipCode.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
    }
  }

  return {
    type: formData.entityType, // Already domain type
    name: formData.entityName.trim(),
    email: formData.email.trim() || undefined,
    phoneNumber: formData.phoneNumber.trim()
      ? `${formData.countryCode} ${formData.phoneNumber}`.trim()
      : undefined,
    profilePictureUrl: undefined, // Would be set after upload
    notes: formData.notes.trim() || undefined,
    location,
  }
}

/**
 * Converts UserFormData to CreateUserPayload.
 * 
 * Since UI now uses domain types, role is passed directly.
 */
export function mapFormToUserPayload(formData: UserFormData): CreateUserPayload {
  return {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim() || undefined,
    email: formData.email.trim(),
    phoneNumber: formData.phoneNumber.trim(),
    countryCode: formData.countryCode,
    role: formData.role, // Already domain type
    notes: undefined,
  }
}

/**
 * Converts UserFormData to admin-specific payload (role forced to "admin").
 */
export function mapFormToAdminPayload(formData: UserFormData): CreateUserPayload {
  return {
    ...mapFormToUserPayload(formData),
    role: "admin",
  }
}

// =============================================================================
// REVERSE MAPPERS (Entity → Form Data)
// =============================================================================

import type { Entity, User } from "@/lib/types"
import type { SelfPhotographerFormData } from "@/components/custom/self-photographer-creation-form"

/**
 * Parses a combined phone number string into country code and number.
 * Handles formats like "+34 649393291" or "649393291"
 */
function parsePhoneNumber(phone: string | undefined): { countryCode: string; phoneNumber: string } {
  if (!phone) {
    return { countryCode: "+34", phoneNumber: "" }
  }

  const trimmed = phone.trim()
  
  // Check if starts with + (country code present)
  if (trimmed.startsWith("+")) {
    // Find first space to split
    const spaceIndex = trimmed.indexOf(" ")
    if (spaceIndex > 0) {
      return {
        countryCode: trimmed.substring(0, spaceIndex),
        phoneNumber: trimmed.substring(spaceIndex + 1),
      }
    }
    // No space, try to extract common country codes
    // Assume first 3 chars are country code if longer
    if (trimmed.length > 4) {
      return {
        countryCode: trimmed.substring(0, 3),
        phoneNumber: trimmed.substring(3).trim(),
      }
    }
  }

  // No country code detected, return as phone number with default code
  return { countryCode: "+34", phoneNumber: trimmed }
}

/**
 * Converts an Entity to EntityBasicInformationFormData.
 * Used when editing an existing entity to hydrate the form.
 * 
 * @param entity - The entity to convert
 * @returns Form data suitable for EntityBasicInformationForm
 */
export function mapEntityToFormData(entity: Entity): EntityBasicInformationFormData {
  const { countryCode, phoneNumber } = parsePhoneNumber(entity.phoneNumber)

  return {
    entityType: entity.type as StandardEntityType,
    entityName: entity.name || "",
    streetAddress: entity.location?.streetAddress || "",
    zipCode: entity.location?.zipCode || "",
    city: entity.location?.city || "",
    country: entity.location?.country || "",
    email: entity.email || "",
    phoneNumber: phoneNumber,
    countryCode: countryCode,
    profilePicture: null, // File cannot be reconstructed from URL
    notes: entity.notes || "",
  }
}

/**
 * Converts an Entity to CreateEntityDraftPayload.
 * Used when preparing to update an existing entity.
 * 
 * @param entity - The entity to convert
 * @returns Draft payload suitable for updateEntityBasicInfo
 */
export function mapEntityToDraft(entity: Entity): CreateEntityDraftPayload {
  return {
    type: entity.type,
    name: entity.name,
    email: entity.email,
    phoneNumber: entity.phoneNumber,
    profilePictureUrl: entity.profilePictureUrl,
    notes: entity.notes,
    location: entity.location,
  }
}

/**
 * Converts Entity + Admin User to SelfPhotographerFormData.
 * Used when viewing/editing an existing self-photographer entity.
 * 
 * @param entity - The self-photographer entity
 * @param adminUser - The admin user associated with the entity
 * @returns Form data suitable for SelfPhotographerForm
 */
export function mapSelfPhotographerToFormData(
  entity: Entity,
  adminUser?: User | null
): SelfPhotographerFormData {
  const { countryCode, phoneNumber } = parsePhoneNumber(
    adminUser?.phoneNumber || entity.phoneNumber
  )

  return {
    firstName: adminUser?.firstName || "",
    lastName: adminUser?.lastName || "",
    email: adminUser?.email || entity.email || "",
    phoneNumber: phoneNumber,
    countryCode: countryCode,
    notes: entity.notes || "",
  }
}

/**
 * Converts SelfPhotographerFormData to CreateEntityDraftPayload.
 * Used when saving self-photographer entity information.
 * 
 * Note: This only updates the entity part. Admin user update would require
 * a separate updateUser method in the repository/service.
 */
export function mapSelfPhotographerFormToEntityDraft(
  formData: SelfPhotographerFormData
): CreateEntityDraftPayload {
  return {
    type: "self-photographer",
    name: `${formData.firstName} ${formData.lastName || ""}`.trim(),
    email: formData.email.trim() || undefined,
    phoneNumber: formData.phoneNumber.trim()
      ? `${formData.countryCode} ${formData.phoneNumber}`.trim()
      : undefined,
    profilePictureUrl: undefined, // Would be set after upload
    notes: formData.notes.trim() || undefined,
    // Self-photographer doesn't require location
    location: undefined,
  }
}
