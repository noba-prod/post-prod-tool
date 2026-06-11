"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  ensureProfilePicturesBucket,
  PROFILE_PICTURES_BUCKET,
} from "@/lib/supabase/ensure-profile-pictures-bucket"
import type { Database, PlayerType, Profile, Player } from "@/lib/supabase/database.types"
import type { CreateEntityDraftPayload, Entity, EntityType, User } from "@/lib/types"

type PhoneInput = {
  prefix?: string
  number?: string
}

type CreatePlayerInput = {
  draft: CreateEntityDraftPayload
  phone?: PhoneInput
  profilePicture?: File | null
}

type CreateAdminInput = {
  playerId: string
  admin: {
    firstName: string
    lastName?: string
    email: string
    phone?: PhoneInput
  }
}

function mapEntityTypeToPlayerType(type: EntityType): PlayerType {
  switch (type) {
    case "client":
      return "client"
    case "agency":
      return "photography_agency"
    case "photo-lab":
      return "photo_lab"
    case "edition-studio":
      return "retouch_studio"
    case "hand-print-lab":
      return "handprint_lab"
    case "self-photographer":
      return "self_photographer"
    default:
      throw new Error(`Unsupported entity type: ${type}`)
  }
}

function mapPlayerTypeToEntityType(type: PlayerType): EntityType {
  switch (type) {
    case "noba":
      return "noba"
    case "client":
      return "client"
    case "photography_agency":
      return "agency"
    case "photo_lab":
      return "photo-lab"
    case "retouch_studio":
      return "edition-studio"
    case "handprint_lab":
      return "hand-print-lab"
    case "self_photographer":
      return "self-photographer"
    default:
      throw new Error(`Unsupported player type: ${type}`)
  }
}

function combinePhone(prefix?: string | null, phone?: string | null): string | undefined {
  const trimmedPhone = phone?.trim()
  if (!trimmedPhone) return undefined
  const trimmedPrefix = prefix?.trim()
  return trimmedPrefix ? `${trimmedPrefix} ${trimmedPhone}`.trim() : trimmedPhone
}

function mapPlayerToEntity(player: Player): Entity {
  const hasLocation = Boolean(
    player.street_address?.trim() ||
    player.zip_code?.trim() ||
    player.city?.trim() ||
    player.country?.trim()
  )

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

function mapProfileToUser(profile: Profile): User {
  return {
    id: profile.id,
    firstName: profile.first_name || "",
    lastName: profile.last_name || undefined,
    email: profile.email,
    phoneNumber: combinePhone(profile.prefix, profile.phone) || "",
    entityId: profile.player_id || "",
    role: profile.role || "admin",
    profilePictureUrl: profile.image || undefined,
    notes: undefined,
  }
}

async function uploadProfilePicture(
  adminSupabase: ReturnType<typeof createAdminClient>,
  userId: string,
  file: File
): Promise<string | null> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png"
  const objectPath = `profiles/${userId}/avatar.${extension}`
  const arrayBuffer = await file.arrayBuffer()

  await ensureProfilePicturesBucket(adminSupabase)

  const { error: uploadError } = await adminSupabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    console.error("Profile picture upload failed:", uploadError)
    return null
  }

  const { data } = adminSupabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .getPublicUrl(objectPath)

  const publicUrl = data.publicUrl || null
  if (!publicUrl) return null

  const { error: updateError } = await adminSupabase
    .from("profiles")
    .update({ image: publicUrl } as never)
    .eq("id", userId)

  if (updateError) {
    console.error("Failed to update profile image:", updateError)
    return null
  }

  return publicUrl
}

async function uploadPlayerProfilePicture(
  adminSupabase: ReturnType<typeof createAdminClient>,
  playerId: string,
  file: File
): Promise<string | null> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png"
  const objectPath = `${playerId}/logo.${extension}`
  const arrayBuffer = await file.arrayBuffer()

  await ensureProfilePicturesBucket(adminSupabase)

  const { error: uploadError } = await adminSupabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    console.error("Profile picture upload failed:", uploadError)
    return null
  }

  const { data } = adminSupabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .getPublicUrl(objectPath)

  return data.publicUrl || null
}

export async function createPlayerFromDraft({
  draft,
  phone,
  profilePicture,
}: CreatePlayerInput): Promise<{ entityId: string; entity: Entity }> {
  const adminSupabase = createAdminClient()

  const playerType = mapEntityTypeToPlayerType(draft.type)
  const trimmedName = draft.name.trim()

  if (!trimmedName) {
    throw new Error("Player name is required")
  }

  const insertPayload: Database["public"]["Tables"]["players"]["Insert"] = {
    type: playerType,
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

  const { data: player, error } = await adminSupabase
    .from("players")
    .insert(insertPayload as never)
    .select("*")
    .single()

  if (error || !player) {
    if (error?.code === "23505") {
      throw new Error("A player with this name already exists")
    }
    throw new Error(error?.message || "Failed to create player")
  }

  const p = player as Player
  if (profilePicture) {
    const publicUrl = await uploadPlayerProfilePicture(
      adminSupabase,
      p.id,
      profilePicture
    )

      if (publicUrl) {
        const { data: updatedPlayer } = await adminSupabase
          .from("players")
          .update({ profile_picture_url: publicUrl } as never)
          .eq("id", p.id)
        .select("*")
        .single()

      if (updatedPlayer) {
        const updated = updatedPlayer as Player
        return {
          entityId: updated.id,
          entity: mapPlayerToEntity(updated),
        }
      }
    }
  }

  return {
    entityId: p.id,
    entity: mapPlayerToEntity(p),
  }
}

/**
 * Updates an existing player in Supabase from entity draft (basic info).
 * Used when the user edits company details and the entity comes from Supabase (not in-memory).
 */
export async function updatePlayerFromDraft(
  playerId: string,
  draft: CreateEntityDraftPayload
): Promise<{ entity: Entity }> {
  const adminSupabase = createAdminClient()

  const trimmedName = draft.name?.trim()
  if (!trimmedName) {
    throw new Error("Player name is required")
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

  const updatePayload: Database["public"]["Tables"]["players"]["Update"] = {
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

  const { data: player, error } = await adminSupabase
    .from("players")
    .update(updatePayload as never)
    .eq("id", playerId)
    .select("*")
    .single()

  if (error || !player) {
    throw new Error(error?.message || "Failed to update player")
  }

  return { entity: mapPlayerToEntity(player as Player) }
}

export async function createAdminForPlayer({
  playerId,
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
    player_id: playerId,
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
 * Combines player and admin user creation in a single step.
 */
type CreateSelfPhotographerInput = {
  firstName: string
  lastName?: string
  email: string
  phone?: PhoneInput
  notes?: string
  profilePicture?: File | null
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
  profilePicture,
}: CreateSelfPhotographerInput): Promise<{
  entityId: string
  entity: Entity
  adminUser: User
  teamMembers: User[]
}> {
  const trimmedFirstName = firstName?.trim()
  const trimmedEmail = email?.trim().toLowerCase()

  if (!trimmedFirstName) {
    throw new Error("First name is required")
  }

  if (!trimmedEmail) {
    throw new Error("Email is required")
  }

  const trimmedLastName = lastName?.trim()
  const entityName = trimmedLastName
    ? `${trimmedFirstName} ${trimmedLastName}`
    : trimmedFirstName

  // Create the player (entity) - no profile picture here; for photographer we use profiles.image
  const { entityId, entity } = await createPlayerFromDraft({
    draft: {
      type: "self-photographer",
      name: entityName,
      email: trimmedEmail,
      notes: notes?.trim(),
      // Self-photographer doesn't require location
      location: undefined,
    },
    phone,
    profilePicture: null, // Photographer uses profiles.image, uploaded after admin creation
  })

  const { adminUser, teamMembers } = await createAdminForPlayer({
    playerId: entityId,
    admin: {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone,
    },
  })

  // Upload profile picture to profiles.image (source of truth for photographer)
  let finalEntity = entity
  if (profilePicture && adminUser.id) {
    const adminSupabase = createAdminClient()
    const publicUrl = await uploadProfilePicture(adminSupabase, adminUser.id, profilePicture)
    if (publicUrl) {
      // Sync players.profile_picture_url from profiles.image
      await adminSupabase
        .from("players")
        .update({ profile_picture_url: publicUrl } as never)
        .eq("id", entityId)
      finalEntity = { ...entity, profilePictureUrl: publicUrl }
    }
  }

  return {
    entityId,
    entity: finalEntity,
    adminUser: {
      ...adminUser,
      profilePictureUrl:
        finalEntity.profilePictureUrl ?? adminUser.profilePictureUrl ?? undefined,
    },
    teamMembers,
  }
}
