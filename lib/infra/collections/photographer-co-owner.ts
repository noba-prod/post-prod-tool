/**
 * When a collection has a collaborating agency, `collections.photographer_id`
 * stores the agency entity. The person who shot is a `photographer` member.
 * Filters and profile lists treat both as photographer co-owners.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

type CollectionsQueryClient = Pick<SupabaseClient<Database>, "from">

const PHOTOGRAPHER_CO_OWNER_ROLES = ["photographer", "agency"] as const

type IdRow = { id: string }
type MemberCollectionRow = { collection_id: string }

type PhotographerCoOwnerParticipant = {
  role: string
  entityId?: string
  userIds?: string[]
}

export function collectionHasPhotographerCoOwnerEntity(
  collection: { participants: PhotographerCoOwnerParticipant[] },
  entityId: string
): boolean {
  return collection.participants.some(
    (participant) =>
      (participant.role === "photographer" || participant.role === "agency") &&
      participant.entityId === entityId
  )
}

export function collectionHasPhotographerCoOwnerUser(
  collection: { participants: PhotographerCoOwnerParticipant[] },
  userId: string
): boolean {
  return collection.participants.some(
    (participant) =>
      (participant.role === "photographer" || participant.role === "agency") &&
      (participant.userIds ?? []).includes(userId)
  )
}

export async function fetchCollectionIdsForPhotographerMembers(
  supabase: CollectionsQueryClient,
  playerEntityId: string
): Promise<string[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("player_id", playerEntityId)

  const userIds = ((profiles ?? []) as IdRow[]).map((row) => row.id)
  if (userIds.length === 0) return []

  const { data: members } = await supabase
    .from("collection_members")
    .select("collection_id")
    .in("role", [...PHOTOGRAPHER_CO_OWNER_ROLES])
    .in("user_id", userIds)

  return [
    ...new Set(
      ((members ?? []) as MemberCollectionRow[]).map((row) => row.collection_id)
    ),
  ]
}

export async function fetchCollectionIdsForPhotographerEntity(
  supabase: CollectionsQueryClient,
  photographerEntityId: string
): Promise<string[]> {
  const ids = new Set(
    await fetchCollectionIdsForPhotographerMembers(supabase, photographerEntityId)
  )

  const { data: fkRows } = await supabase
    .from("collections")
    .select("id")
    .eq("photographer_id", photographerEntityId)

  for (const row of (fkRows ?? []) as IdRow[]) {
    ids.add(row.id)
  }

  return [...ids]
}
