/**
 * Supabase Profile Service
 * 
 * Fetches user profile and organization data from Supabase
 * to determine navigation variant and access permissions.
 */

import { createClient } from "@/lib/supabase/client"
import type { EntityType, User, Entity, Role } from "@/lib/types"
import type { OrganizationType, Profile, Organization } from "@/lib/supabase/database.types"

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * The noba* production agency organization ID.
 * Users with this organization_id AND is_internal=true are considered noba variant.
 */
export const NOBA_ORGANIZATION_ID = "7abddcb4-52d3-4f96-b399-ff094c01ec53"

// =============================================================================
// TYPE MAPPING
// =============================================================================

/**
 * Maps database OrganizationType to frontend EntityType.
 * 
 * Database types → Frontend types:
 * - noba → noba
 * - client → client
 * - photography_agency → agency
 * - self_photographer → self-photographer
 * - photo_lab → photo-lab
 * - edition_studio → edition-studio
 * - handprint_lab → hand-print-lab
 */
export function mapOrganizationTypeToEntityType(orgType: OrganizationType): EntityType {
  const mapping: Record<OrganizationType, EntityType> = {
    "noba": "noba",
    "client": "client",
    "photography_agency": "agency",
    "self_photographer": "self-photographer",
    "photo_lab": "photo-lab",
    "retouch_studio": "edition-studio",
    "handprint_lab": "hand-print-lab",
  }
  return mapping[orgType]
}

/**
 * Determines the entity type for a user based on their profile and organization.
 * 
 * Rules (as specified):
 * 1. If is_internal=true AND organization_id=NOBA_ORGANIZATION_ID AND organization.type='noba' → "noba"
 * 2. If is_internal=true (backup rule for internal staff without specific org) → "noba"
 * 3. If organization.type = 'self_photographer' → "self-photographer"
 * 4. Otherwise → map organization type to entity type (collaborator variant)
 */
export function determineEntityType(
  profile: Profile,
  organization: Organization | null
): EntityType {
  // Rule 1: Full noba check (is_internal + correct org ID + noba type)
  if (
    profile.is_internal && 
    profile.organization_id === NOBA_ORGANIZATION_ID &&
    organization?.type === "noba"
  ) {
    return "noba"
  }

  // Rule 2: Internal users without specific org are still noba variant
  // This handles cases where internal staff might not have an org assigned
  if (profile.is_internal) {
    console.log(`[SupabaseProfileService] User ${profile.id} is internal, treating as noba`)
    return "noba"
  }

  // Rule 3 & 4: Check organization type
  if (organization) {
    // self_photographer → photographer variant
    // noba org type (but not is_internal) → still noba (edge case)
    // all others → collaborator variant
    return mapOrganizationTypeToEntityType(organization.type)
  }

  // Fallback: if no organization and not internal, default to client
  // This shouldn't happen in normal usage
  console.warn(`[SupabaseProfileService] User ${profile.id} has no organization and is not internal`)
  return "client"
}

// =============================================================================
// SERVICE
// =============================================================================

export interface SupabaseUserData {
  user: User
  entity: Entity
  /** True when profile.organization_id === NOBA_ORGANIZATION_ID && profile.is_internal === true (can create collections). */
  isNobaProducerUser: boolean
}

/**
 * Fetches user profile with organization data from Supabase.
 * 
 * @param userId - The Supabase auth user ID
 * @returns User and Entity data, or null if not found
 */
export async function fetchSupabaseUserData(userId: string): Promise<SupabaseUserData | null> {
  const supabase = createClient()

  try {
    // Fetch profile with organization in a single query
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        organization_id,
        first_name,
        last_name,
        email,
        phone,
        prefix,
        role,
        is_internal,
        image,
        created_at,
        updated_at
      `)
      .eq("id", userId)
      .single()

    if (profileError || !profile) {
      console.error("[SupabaseProfileService] Failed to fetch profile:", profileError)
      return null
    }

    // Type assertion: Supabase .single() return type can be inferred as never when using select()
    const p = profile as Profile

    // Fetch organization if user has one
    let organization: Organization | null = null
    if (p.organization_id) {
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", p.organization_id)
        .single()

      if (orgError) {
        console.error("[SupabaseProfileService] Failed to fetch organization:", orgError)
        // Continue without organization data
      } else if (orgData) {
        organization = orgData as Organization
      }
    }

    // Determine entity type based on profile and organization
    const entityType = determineEntityType(p, organization)

    // Build User object
    const user: User = {
      id: p.id,
      firstName: p.first_name || "",
      lastName: p.last_name || undefined,
      email: p.email,
      phoneNumber: p.phone || "",
      entityId: p.organization_id || NOBA_ORGANIZATION_ID, // Use noba org for internal users
      role: (p.role as Role) || "viewer",
      profilePictureUrl: p.image || undefined,
      notes: undefined,
    }

    // Build Entity object
    const entity: Entity = {
      id: organization?.id || NOBA_ORGANIZATION_ID,
      type: entityType,
      name: organization?.name || "noba*",
      email: organization?.email || undefined,
      phoneNumber: organization?.phone || undefined,
      profilePictureUrl: organization?.profile_picture_url || undefined,
      notes: organization?.notes || undefined,
      location: organization?.street_address ? {
        streetAddress: organization.street_address,
        zipCode: organization.zip_code || "",
        city: organization.city || "",
        country: organization.country || "",
      } : undefined,
      updatedAt: organization?.updated_at ? new Date(organization.updated_at) : undefined,
    }

    const isNobaProducerUser =
      p.is_internal === true && p.organization_id === NOBA_ORGANIZATION_ID

    console.log(`[SupabaseProfileService] Loaded user data:`, {
      userId: user.id,
      email: user.email,
      isInternal: p.is_internal,
      organizationId: p.organization_id,
      isNobaProducerUser,
      entityType,
      entityName: entity.name,
    })

    return { user, entity, isNobaProducerUser }
  } catch (error) {
    console.error("[SupabaseProfileService] Unexpected error:", error)
    return null
  }
}

/**
 * Determines the navigation variant based on entity type.
 * 
 * Rules:
 * - "noba" entity type → "noba" variant
 * - "self-photographer" entity type → "photographer" variant
 * - All other entity types → "collaborator" variant
 */
export function getNavBarVariant(entityType: EntityType): "noba" | "collaborator" | "photographer" {
  if (entityType === "noba") return "noba"
  if (entityType === "self-photographer") return "photographer"
  return "collaborator"
}
