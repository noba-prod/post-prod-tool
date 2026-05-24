import type { EntityType } from "@/lib/types"
import type { CollectionParticipant, ParticipantRole } from "@/lib/domain/collections"

export type EntityTeamAdminProfile = {
  role?: string | null
  is_internal?: boolean | null
  player_id?: string | null
}

/** Entity types that support a Team section and collection "My team" management. */
export const ENTITY_TYPES_WITH_TEAM: EntityType[] = [
  "client",
  "agency",
  "photo-lab",
  "hand-print-lab",
  "edition-studio",
]

/**
 * True for non-internal entity admins (profiles/role = admin, is_internal = false).
 * Excludes self-photographer and noba internal users.
 */
export function isEntityTeamAdminProfile(
  profile: EntityTeamAdminProfile | null | undefined,
  entityType: EntityType | null | undefined
): boolean {
  if (!profile?.player_id) return false
  if (profile.is_internal) return false
  if (!entityType || entityType === "self-photographer" || entityType === "noba") {
    return false
  }
  return String(profile.role ?? "").toLowerCase() === "admin"
}

/** Maps frontend entity type to collection participant role. */
export function entityTypeToParticipantRole(
  entityType: EntityType
): ParticipantRole | null {
  const mapping: Partial<Record<EntityType, ParticipantRole>> = {
    client: "client",
    agency: "agency",
    "photo-lab": "photo_lab",
    "hand-print-lab": "handprint_lab",
    "edition-studio": "retouch_studio",
  }
  return mapping[entityType] ?? null
}

/** Participants whose entityId matches the given player (e.g. shared photo + handprint lab). */
export function findParticipantsForEntity(
  participants: CollectionParticipant[],
  playerId: string
): CollectionParticipant[] {
  const id = playerId.trim()
  if (!id) return []
  return participants.filter((p) => p.entityId?.trim() === id)
}

/**
 * Whether the caller can add/remove team members on their player.
 * Entity users: admin only. Internal noba users: admin or editor.
 */
export function canManagePlayerTeamMembers(
  profile: EntityTeamAdminProfile,
  targetPlayerId: string
): boolean {
  const isInternal = Boolean(profile.is_internal)
  if (isInternal) {
    return profile.role === "admin" || profile.role === "editor"
  }
  return (
    profile.player_id === targetPlayerId &&
    String(profile.role ?? "").toLowerCase() === "admin"
  )
}
