/**
 * Supabase Profile Service
 *
 * Fetches user profile and player data from Supabase
 * to determine navigation variant and access permissions.
 */

import { createClient } from "@/lib/supabase/client"
import type { EntityType, User, Entity, Role } from "@/lib/types"
import type { PlayerType, Profile, Player } from "@/lib/supabase/database.types"

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Legacy noba* player ID fallback.
 * Kept for defensive defaults when a profile has no player.
 */
export const NOBA_PLAYER_ID = "7abddcb4-52d3-4f96-b399-ff094c01ec53"

// =============================================================================
// TYPE MAPPING
// =============================================================================

/**
 * Maps database PlayerType to frontend EntityType.
 *
 * Database types → Frontend types:
 * - noba → noba
 * - client → client
 * - photography_agency → agency
 * - self_photographer → self-photographer
 * - photo_lab → photo-lab
 * - retouch_studio → edition-studio
 * - handprint_lab → hand-print-lab
 */
export function mapPlayerTypeToEntityType(playerType: PlayerType): EntityType {
  const mapping: Record<PlayerType, EntityType> = {
    "noba": "noba",
    "client": "client",
    "photography_agency": "agency",
    "self_photographer": "self-photographer",
    "photo_lab": "photo-lab",
    "retouch_studio": "edition-studio",
    "handprint_lab": "hand-print-lab",
  }
  return mapping[playerType]
}

/**
 * Determines the entity type for a user based on their profile and player.
 *
 * Rules (as specified):
 * 1. If is_internal=true AND player.type='noba' → "noba"
 * 2. If is_internal=true (backup rule for internal staff without specific player) → "noba"
 * 3. If player.type = 'self_photographer' → "self-photographer"
 * 4. Otherwise → map player type to entity type (collaborator variant)
 */
export function determineEntityType(
  profile: Profile,
  player: Player | null
): EntityType {
  // Rule 1: Full noba check (is_internal + noba player type)
  if (
    profile.is_internal &&
    player?.type === "noba"
  ) {
    return "noba"
  }

  // Rule 2: Internal users without specific player are still noba variant
  // This handles cases where internal staff might not have a player assigned
  if (profile.is_internal) {
    console.log(`[SupabaseProfileService] User ${profile.id} is internal, treating as noba`)
    return "noba"
  }

  // Rule 3 & 4: Check player type
  if (player) {
    // self_photographer → photographer variant
    // noba player type (but not is_internal) → still noba (edge case)
    // all others → collaborator variant
    return mapPlayerTypeToEntityType(player.type)
  }

  // Fallback: if no player and not internal, default to client
  // This shouldn't happen in normal usage
  console.warn(`[SupabaseProfileService] User ${profile.id} has no player and is not internal`)
  return "client"
}

// =============================================================================
// SERVICE
// =============================================================================

export interface SupabaseUserData {
  user: User
  entity: Entity
  /** True when profile.is_internal === true and player.type === "noba" (can create collections). */
  isNobaProducerUser: boolean
}

/**
 * Fetches user profile with player data from Supabase.
 *
 * @param userId - The Supabase auth user ID
 * @returns User and Entity data, or null if not found
 */
export async function fetchSupabaseUserData(userId: string): Promise<SupabaseUserData | null> {
  const supabase = createClient()

  try {
    // Fetch profile with player in a single query
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        player_id,
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

    // Fetch player if user has one
    let player: Player | null = null
    if (p.player_id) {
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("id", p.player_id)
        .single()

      if (playerError) {
        console.error("[SupabaseProfileService] Failed to fetch player:", playerError)
        // Continue without player data
      } else if (playerData) {
        player = playerData as Player
      }
    }

    // Determine entity type based on profile and player
    const entityType = determineEntityType(p, player)

    // Build User object
    const user: User = {
      id: p.id,
      firstName: p.first_name || "",
      lastName: p.last_name || undefined,
      email: p.email,
      phoneNumber: p.phone || "",
      entityId: p.player_id || NOBA_PLAYER_ID, // Use noba player for internal users
      role: (p.role as Role) || "viewer",
      profilePictureUrl: p.image || undefined,
      notes: undefined,
    }

    // Build Entity object
    // For self-photographer: use profile.image (profiles) as source of truth, not player.profile_picture_url
    const entityProfilePictureUrl =
      entityType === "self-photographer"
        ? (p.image || undefined)
        : (player?.profile_picture_url || undefined)
    const entity: Entity = {
      id: player?.id || NOBA_PLAYER_ID,
      type: entityType,
      name: player?.name || "noba*",
      email: player?.email || undefined,
      phoneNumber: player?.phone || undefined,
      profilePictureUrl: entityProfilePictureUrl,
      notes: player?.notes || undefined,
      location: player?.street_address ? {
        streetAddress: player.street_address,
        zipCode: player.zip_code || "",
        city: player.city || "",
        country: player.country || "",
      } : undefined,
      updatedAt: player?.updated_at ? new Date(player.updated_at) : undefined,
    }

    const isNobaProducerUser =
      p.is_internal === true && player?.type === "noba"

    console.log(`[SupabaseProfileService] Loaded user data:`, {
      userId: user.id,
      email: user.email,
      isInternal: p.is_internal,
      playerId: p.player_id,
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
