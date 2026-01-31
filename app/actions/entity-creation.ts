"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Database, OrganizationType, Profile, Organization } from "@/lib/supabase/database.types"
import type { CreateEntityDraftPayload, Entity, EntityType, User } from "@/lib/types"

type PhoneInput = {
  prefix?: string
  number?: string
}

type CreateOrganizationInput = {
  draft: CreateEntityDraftPayload
  phone?: PhoneInput
  profilePicture?: File | null
}

type CreateAdminInput = {
  organizationId: string
  admin: {
    firstName: string
    lastName?: string
    email: string
    phone?: PhoneInput
  }
}

function mapEntityTypeToOrganizationType(type: EntityType): OrganizationType {
  switch (type) {
    case "client":
      return "client"
    case "agency":
      return "photography_agency"
    case "photo-lab":
      return "lab_low_res_scan"
    case "edition-studio":
      return "edition_studio"
    case "hand-print-lab":
      return "hand_print_lab"
    case "self-photographer":
      return "self_photographer"
    default:
      throw new Error(`Unsupported entity type: ${type}`)
  }
}

function mapOrganizationTypeToEntityType(type: OrganizationType): EntityType {
  switch (type) {
    case "noba":
      return "noba"
    case "client":
      return "client"
    case "photography_agency":
      return "agency"
    case "lab_low_res_scan":
      return "photo-lab"
    case "edition_studio":
      return "edition-studio"
    case "hand_print_lab":
      return "hand-print-lab"
    case "self_photographer":
      return "self-photographer"
    default:
      throw new Error(`Unsupported organization type: ${type}`)
  }
}

function combinePhone(prefix?: string | null, phone?: string | null): string | undefined {
  const trimmedPhone = phone?.trim()
  if (!trimmedPhone) return undefined
  const trimmedPrefix = prefix?.trim()
  return trimmedPrefix ? `${trimmedPrefix} ${trimmedPhone}`.trim() : trimmedPhone
}

function mapOrganizationToEntity(org: Organization): Entity {
  const hasLocation = Boolean(
    org.street_address?.trim() ||
    org.zip_code?.trim() ||
    org.city?.trim() ||
    org.country?.trim()
  )

  return {
    id: org.id,
    type: mapOrganizationTypeToEntityType(org.type),
    name: org.name,
    email: org.email || undefined,
    phoneNumber: combinePhone(org.prefix, org.phone),
    profilePictureUrl: org.profile_picture_url || undefined,
    notes: org.notes || undefined,
    location: hasLocation
      ? {
          streetAddress: org.street_address || "",
          zipCode: org.zip_code || "",
          city: org.city || "",
          country: org.country || "",
        }
      : undefined,
    updatedAt: org.updated_at ? new Date(org.updated_at) : undefined,
  }
}

function mapProfileToUser(profile: Profile): User {
  return {
    id: profile.id,
    firstName: profile.first_name || "",
    lastName: profile.last_name || undefined,
    email: profile.email,
    phoneNumber: combinePhone(profile.prefix, profile.phone) || "",
    entityId: profile.organization_id || "",
    role: profile.role || "admin",
    notes: undefined,
  }
}

async function uploadOrganizationProfilePicture(
  adminSupabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
  file: File
): Promise<string | null> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png"
  const objectPath = `${organizationId}/logo.${extension}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await adminSupabase.storage
    .from("profile-pictures")
    .upload(objectPath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    console.error("Profile picture upload failed:", uploadError)
    return null
  }

  const { data } = adminSupabase.storage
    .from("profile-pictures")
    .getPublicUrl(objectPath)

  return data.publicUrl || null
}

export async function createOrganizationFromDraft({
  draft,
  phone,
  profilePicture,
}: CreateOrganizationInput): Promise<{ entityId: string; entity: Entity }> {
  const adminSupabase = createAdminClient()

  const organizationType = mapEntityTypeToOrganizationType(draft.type)
  const trimmedName = draft.name.trim()

  if (!trimmedName) {
    throw new Error("Organization name is required")
  }

  const insertPayload: Database["public"]["Tables"]["organizations"]["Insert"] = {
    type: organizationType,
    name: trimmedName,
    email: draft.email?.trim() || null,
    phone: phone?.number?.trim() || null,
    prefix: phone?.number?.trim() ? phone?.prefix?.trim() || null : null,
    profile_picture_url: null,
    notes: draft.notes?.trim() || null,
    street_address: draft.location?.streetAddress?.trim() || null,
    zip_code: draft.location?.zipCode?.trim() || null,
    city: draft.location?.city?.trim() || null,
    country: draft.location?.country?.trim() || null,
  }

  const { data: organization, error } = await adminSupabase
    .from("organizations")
    .insert(insertPayload as never)
    .select("*")
    .single()

  if (error || !organization) {
    throw new Error(error?.message || "Failed to create organization")
  }

  const org = organization as Organization
  if (profilePicture) {
    const publicUrl = await uploadOrganizationProfilePicture(
      adminSupabase,
      org.id,
      profilePicture
    )

      if (publicUrl) {
        const { data: updatedOrg } = await adminSupabase
          .from("organizations")
          .update({ profile_picture_url: publicUrl } as never)
          .eq("id", org.id)
        .select("*")
        .single()

      if (updatedOrg) {
        const updated = updatedOrg as Organization
        return {
          entityId: updated.id,
          entity: mapOrganizationToEntity(updated),
        }
      }
    }
  }

  return {
    entityId: org.id,
    entity: mapOrganizationToEntity(org),
  }
}

/**
 * Updates an existing organization in Supabase from entity draft (basic info).
 * Used when the user edits company details and the entity comes from Supabase (not in-memory).
 */
export async function updateOrganizationFromDraft(
  organizationId: string,
  draft: CreateEntityDraftPayload
): Promise<{ entity: Entity }> {
  const adminSupabase = createAdminClient()

  const trimmedName = draft.name?.trim()
  if (!trimmedName) {
    throw new Error("Organization name is required")
  }

  const phoneTrimmed = draft.phoneNumber?.trim()
  const prefix = phoneTrimmed ? phoneTrimmed.split(/\s+/)[0] || null : null
  const phone = phoneTrimmed
    ? phoneTrimmed
        .split(/\s+/)
        .slice(1)
        .join(" ")
        .trim() || null
    : null

  const updatePayload: Database["public"]["Tables"]["organizations"]["Update"] = {
    name: trimmedName,
    email: draft.email?.trim() || null,
    phone,
    prefix,
    notes: draft.notes?.trim() || null,
    street_address: draft.location?.streetAddress?.trim() || null,
    zip_code: draft.location?.zipCode?.trim() || null,
    city: draft.location?.city?.trim() || null,
    country: draft.location?.country?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { data: organization, error } = await adminSupabase
    .from("organizations")
    .update(updatePayload as never)
    .eq("id", organizationId)
    .select("*")
    .single()

  if (error || !organization) {
    throw new Error(error?.message || "Failed to update organization")
  }

  return { entity: mapOrganizationToEntity(organization as Organization) }
}

export async function createAdminForOrganization({
  organizationId,
  admin,
}: CreateAdminInput): Promise<{ adminUser: User; teamMembers: User[] }> {
  const adminSupabase = createAdminClient()

  const email = admin.email.trim().toLowerCase()
  if (!email) {
    throw new Error("Email is required")
  }

  const { data: newUser, error: userError } =
    await adminSupabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })

  if (userError || !newUser.user) {
    throw new Error(userError?.message || "Failed to create user account")
  }

  const profilePayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
    id: newUser.user.id,
    organization_id: organizationId,
    first_name: admin.firstName.trim(),
    last_name: admin.lastName?.trim() || null,
    email,
    phone: admin.phone?.number?.trim() || null,
    prefix: admin.phone?.number?.trim() ? admin.phone?.prefix?.trim() || null : null,
    role: "admin",
    is_internal: false,
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .upsert(profilePayload as never, { onConflict: "id" })
    .select("*")
    .single()

  if (profileError || !profile) {
    throw new Error(profileError?.message || "Failed to create admin profile")
  }

  const adminUser = mapProfileToUser(profile)

  return {
    adminUser,
    teamMembers: [adminUser],
  }
}

/**
 * Input type for creating a self-photographer entity.
 * Combines organization and admin user creation in a single step.
 */
type CreateSelfPhotographerInput = {
  firstName: string
  lastName?: string
  email: string
  phone?: PhoneInput
  notes?: string
}

/**
 * Creates a self-photographer entity with its admin user in Supabase.
 * 
 * This is a single-step creation flow where:
 * - Entity type is fixed to "self-photographer"
 * - Admin role is fixed to "admin"
 * - Entity name is derived from firstName + lastName
 * - No location fields are required
 * 
 * @param input Self-photographer data
 * @returns Created entity, admin user, and team members
 */
export async function createSelfPhotographerInSupabase({
  firstName,
  lastName,
  email,
  phone,
  notes,
}: CreateSelfPhotographerInput): Promise<{
  entityId: string
  entity: Entity
  adminUser: User
  teamMembers: User[]
}> {
  // Validate required fields
  const trimmedFirstName = firstName?.trim()
  const trimmedEmail = email?.trim().toLowerCase()

  if (!trimmedFirstName) {
    throw new Error("First name is required")
  }

  if (!trimmedEmail) {
    throw new Error("Email is required")
  }

  // Derive entity name from firstName + lastName
  const trimmedLastName = lastName?.trim()
  const entityName = trimmedLastName
    ? `${trimmedFirstName} ${trimmedLastName}`
    : trimmedFirstName

  // Create the organization (entity)
  const { entityId, entity } = await createOrganizationFromDraft({
    draft: {
      type: "self-photographer",
      name: entityName,
      email: trimmedEmail,
      notes: notes?.trim(),
      // Self-photographer doesn't require location
      location: undefined,
    },
    phone,
    profilePicture: null,
  })

  // Create the admin user
  const { adminUser, teamMembers } = await createAdminForOrganization({
    organizationId: entityId,
    admin: {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone,
    },
  })

  return {
    entityId,
    entity,
    adminUser,
    teamMembers,
  }
}
