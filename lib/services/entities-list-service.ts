import type { EntityType } from "@/lib/types"
import { entityTypeToLabel } from "@/lib/types"
import type { PlayerType, Profile } from "@/lib/supabase/database.types"

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
  /** Display label for entity type (e.g., "Photo Lab", "Photographer") */
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
const playerTypeToEntityType: Record<PlayerType, EntityType> = {
  noba: "noba",
  client: "client",
  photography_agency: "agency",
  self_photographer: "self-photographer",
  photo_lab: "photo-lab",
  retouch_studio: "edition-studio",
  handprint_lab: "hand-print-lab",
}

function mapPlayerTypeToEntityType(type: PlayerType): EntityType {
  return playerTypeToEntityType[type]
}

function getEntityTypeLabel(entityType: EntityType): string {
  if (entityType === "self-photographer") {
    return "Photographer"
  }
  return entityTypeToLabel(entityType)
}

export type EntitiesApiResponse = {
  players: Array<{
    id: string
    name: string
    type: PlayerType
  }>
  profiles: Array<Pick<Profile, "id" | "player_id" | "first_name" | "last_name" | "role">>
  collections: Array<{
    id: string
    client_id: string
  }>
  debug?: Record<string, unknown>
}

/**
 * Maps raw GET /api/players response to EntityListItem[].
 * Used when you already have the API response and want to avoid a second fetch.
 */
export function mapPlayersApiToEntities(data: EntitiesApiResponse): EntityListItem[] {
  if (!data.players || data.players.length === 0) {
    return []
  }

  const profilesByPlayer = new Map<string, typeof data.profiles[0][]>()
  for (const profile of data.profiles || []) {
    if (!profile.player_id) continue
    const existing = profilesByPlayer.get(profile.player_id) || []
    existing.push(profile)
    profilesByPlayer.set(profile.player_id, existing)
  }

  const collectionsCountByPlayer = new Map<string, number>()
  for (const collection of data.collections || []) {
    const existing = collectionsCountByPlayer.get(collection.client_id) || 0
    collectionsCountByPlayer.set(collection.client_id, existing + 1)
  }

  return data.players.map((player) => {
    const entityType = mapPlayerTypeToEntityType(player.type)
    const typeLabel = getEntityTypeLabel(entityType)
    const playerProfiles = profilesByPlayer.get(player.id) || []
    const admins = playerProfiles.filter((profile) => profile.role === "admin")

    let adminDisplay = "No admin"
    if (admins.length > 0) {
      const admin = admins[0]
      const adminName = [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim()
      if (adminName) {
        adminDisplay = adminName
      }
    }

    return {
      id: player.id,
      name: player.name,
      type: typeLabel,
      rawType: entityType,
      admin: adminDisplay,
      adminUserId: admins.length > 0 ? admins[0].id : null,
      teamMembers: playerProfiles.length,
      collections: collectionsCountByPlayer.get(player.id) || 0,
    }
  })
}

export class EntitiesListService {

  /**
   * Retrieves all entities with computed display columns.
   *
   * @returns Array of entities with admin name, team member count, etc.
   */
  async listEntities(): Promise<EntityListItem[]> {
    const response = await fetch("/api/players", {
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
    return mapPlayersApiToEntities(data)
  }
}
