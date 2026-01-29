import type { EntityType } from "@/lib/types"
import { entityTypeToLabel } from "@/lib/types"
import type { OrganizationType, Profile } from "@/lib/supabase/database.types"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Entity row for display in the entities table.
 * Includes computed columns derived from related data.
 */
export interface EntityListItem {
  id: string
  name: string
  /** Display label for entity type (e.g., "Photo Lab", "Self-Photographer") */
  type: string
  /** Raw entity type for filtering */
  rawType: EntityType
  /** Admin user name (with "+N" suffix if multiple admins) */
  admin: string
  /** Admin user ID (first admin if multiple, null if none) */
  adminUserId: string | null
  /** Count of team members */
  teamMembers: number
  /** Count of collections (placeholder for future) */
  collections: number
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Service for listing entities with computed columns.
 * Aggregates data from entity and user repositories.
 */
const organizationTypeToEntityType: Record<OrganizationType, EntityType> = {
  client: "client",
  photography_agency: "agency",
  self_photographer: "self-photographer",
  lab_low_res_scan: "photo-lab",
  edition_studio: "edition-studio",
  hand_print_lab: "hand-print-lab",
}

function mapOrganizationTypeToEntityType(type: OrganizationType): EntityType {
  return organizationTypeToEntityType[type]
}

function getEntityTypeLabel(entityType: EntityType): string {
  if (entityType === "self-photographer") {
    return "Photographer"
  }
  return entityTypeToLabel(entityType)
}

type EntitiesApiResponse = {
  organizations: Array<{
    id: string
    name: string
    type: OrganizationType
  }>
  profiles: Array<Pick<Profile, "id" | "organization_id" | "first_name" | "last_name" | "role">>
  collections: Array<{
    id: string
    client_id: string
  }>
  debug?: Record<string, unknown>
}

export class EntitiesListService {

  /**
   * Retrieves all entities with computed display columns.
   * 
   * @returns Array of entities with admin name, team member count, etc.
   */
  async listEntities(): Promise<EntityListItem[]> {
    const response = await fetch("/api/entities", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      let errorMessage = `Failed to load entities (${response.status})`
      try {
        const errorBody = (await response.json()) as { error?: string }
        if (errorBody.error) {
          errorMessage = errorBody.error
        }
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(errorMessage)
    }

    const data = (await response.json()) as EntitiesApiResponse

    if (!data.organizations || data.organizations.length === 0) {
      return []
    }

    const profilesByOrganization = new Map<string, Profile[]>()
    for (const profile of data.profiles || []) {
      if (!profile.organization_id) continue
      const existing = profilesByOrganization.get(profile.organization_id) || []
      existing.push(profile)
      profilesByOrganization.set(profile.organization_id, existing)
    }

    const collectionsCountByOrganization = new Map<string, number>()
    for (const collection of data.collections || []) {
      const existing = collectionsCountByOrganization.get(collection.client_id) || 0
      collectionsCountByOrganization.set(collection.client_id, existing + 1)
    }

    return data.organizations.map((organization) => {
      const entityType = mapOrganizationTypeToEntityType(organization.type)
      const typeLabel = getEntityTypeLabel(entityType)
      const organizationProfiles = profilesByOrganization.get(organization.id) || []
      const admins = organizationProfiles.filter((profile) => profile.role === "admin")

      let adminDisplay = "No admin"
      if (admins.length > 0) {
        const admin = admins[0]
        const adminName = [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim()
        if (adminName) {
          adminDisplay = adminName
        }
      }

      return {
        id: organization.id,
        name: organization.name,
        type: typeLabel,
        rawType: entityType,
        admin: adminDisplay,
        adminUserId: admins.length > 0 ? admins[0].id : null,
        teamMembers: organizationProfiles.length,
        collections: collectionsCountByOrganization.get(organization.id) || 0,
      }
    })
  }
}
