import type { Player, PlayerType, Profile } from "@/lib/supabase/database.types"
import type { Entity, EntityType, Role, User } from "@/lib/types"

const playerTypeToEntityType: Record<PlayerType, EntityType> = {
  noba: "noba",
  client: "client",
  photography_agency: "agency",
  self_photographer: "self-photographer",
  photo_lab: "photo-lab",
  retouch_studio: "edition-studio",
  handprint_lab: "hand-print-lab",
}

function combinePhone(prefix: string | null, phone: string | null): string | undefined {
  if (phone && prefix) {
    return `${prefix} ${phone}`.trim()
  }
  if (phone) {
    return phone
  }
  if (prefix) {
    return prefix
  }
  return undefined
}

function resolveRole(role: Profile["role"]): Role {
  return role || "viewer"
}

export function mapPlayerTypeToEntityType(type: PlayerType): EntityType {
  return playerTypeToEntityType[type]
}

export function mapPlayerToEntity(player: Player): Entity {
  const hasLocation =
    player.street_address || player.zip_code || player.city || player.country

  return {
    id: player.id,
    type: mapPlayerTypeToEntityType(player.type),
    name: player.name,
    email: player.email || undefined,
    phoneNumber: combinePhone(player.prefix, player.phone),
    profilePictureUrl: player.profile_picture_url || undefined,
    notes: player.notes || undefined,
    location: hasLocation
      ? {
          streetAddress: player.street_address || "",
          zipCode: player.zip_code || "",
          city: player.city || "",
          country: player.country || "",
        }
      : undefined,
    updatedAt: player.updated_at ? new Date(player.updated_at) : undefined,
  }
}

export function mapProfileToUser(profile: Profile): User {
  return {
    id: profile.id,
    firstName: profile.first_name || "",
    lastName: profile.last_name || undefined,
    email: profile.email,
    phoneNumber: combinePhone(profile.prefix, profile.phone) || "",
    entityId: profile.player_id || "",
    role: resolveRole(profile.role),
    profilePictureUrl: profile.image || undefined,
    notes: undefined,
  }
}

export function mapProfilesToUsers(profiles: Profile[]): User[] {
  return profiles.map(mapProfileToUser)
}
