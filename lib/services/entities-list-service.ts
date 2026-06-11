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
  /** Admin user email (first admin if multiple) */
  adminEmail: string
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
  profiles: Array<
    Pick<Profile, "id" | "player_id" | "first_name" | "last_name" | "role" | "email">
  >
  collections: Array<{
    id: string
    client_id: string
    photographer_id: string | null
    photo_lab_id: string | null
    retouch_studio_id: string | null
    handprint_lab_id: string | null
  }>
  collectionMembers?: Array<{
    collection_id: string
    user_id: string
  }>
  hasMore?: boolean
  debug?: Record<string, unknown>
}

export interface EntitiesPageResult {
  items: EntityListItem[]
  hasMore: boolean
}

type CollectionRow = EntitiesApiResponse["collections"][number]

/** Unique collection count per player (client FK, entity FKs, or invited team user). */
function buildCollectionsCountByPlayer(
  collections: CollectionRow[],
  members: Array<{ collection_id: string; user_id: string }>,
  userIdToPlayerId: Map<string, string>
): Map<string, number> {
  const collectionIdsByPlayer = new Map<string, Set<string>>()

  const linkPlayer = (playerId: string | null | undefined, collectionId: string) => {
    if (!playerId) return
    let set = collectionIdsByPlayer.get(playerId)
    if (!set) {
      set = new Set()
      collectionIdsByPlayer.set(playerId, set)
    }
    set.add(collectionId)
  }

  const memberUserIdsByCollection = new Map<string, string[]>()
  for (const member of members) {
    const list = memberUserIdsByCollection.get(member.collection_id) ?? []
    list.push(member.user_id)
    memberUserIdsByCollection.set(member.collection_id, list)
  }

  for (const collection of collections) {
    linkPlayer(collection.client_id, collection.id)
    linkPlayer(collection.photographer_id, collection.id)
    linkPlayer(collection.photo_lab_id, collection.id)
    linkPlayer(collection.retouch_studio_id, collection.id)
    linkPlayer(collection.handprint_lab_id, collection.id)

    for (const userId of memberUserIdsByCollection.get(collection.id) ?? []) {
      linkPlayer(userIdToPlayerId.get(userId), collection.id)
    }
  }

  const counts = new Map<string, number>()
  for (const [playerId, collectionIds] of collectionIdsByPlayer) {
    counts.set(playerId, collectionIds.size)
  }
  return counts
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

  const userIdToPlayerId = new Map<string, string>()
  for (const profile of data.profiles || []) {
    if (profile.player_id) {
      userIdToPlayerId.set(profile.id, profile.player_id)
    }
  }

  const collectionsCountByPlayer = buildCollectionsCountByPlayer(
    data.collections || [],
    data.collectionMembers ?? [],
    userIdToPlayerId
  )

  return data.players.map((player) => {
    const entityType = mapPlayerTypeToEntityType(player.type)
    const typeLabel = getEntityTypeLabel(entityType)
    const playerProfiles = profilesByPlayer.get(player.id) || []
    const admins = playerProfiles.filter((profile) => profile.role === "admin")
    const isSelfPhotographer = entityType === "self-photographer"
    const primaryProfile = admins[0] ?? playerProfiles[0]

    let adminDisplay = "No admin"
    let adminEmail = "—"
    if (primaryProfile) {
      const adminName = [primaryProfile.first_name, primaryProfile.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()
      if (adminName) {
        adminDisplay = adminName
      }
      const email = primaryProfile.email?.trim()
      if (email) {
        adminEmail = email
      }
    }

    return {
      id: player.id,
      name: player.name,
      type: typeLabel,
      rawType: entityType,
      admin: adminDisplay,
      adminUserId: isSelfPhotographer
        ? (primaryProfile?.id ?? null)
        : admins.length > 0
          ? admins[0].id
          : null,
      adminEmail,
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

  async listEntitiesPage(options: {
    limit: number
    offset: number
  }): Promise<EntitiesPageResult> {
    const params = new URLSearchParams({
      limit: String(options.limit),
      offset: String(options.offset),
    })
    const response = await fetch(`/api/players?${params.toString()}`, {
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
    return {
      items: mapPlayersApiToEntities(data),
      hasMore: Boolean(data.hasMore),
    }
  }
}
