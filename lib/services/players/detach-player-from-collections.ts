import type { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Before deleting a non-client player, unlink it from collections without deleting them:
 * - Remove team users from collection_members
 * - Clear collection FK columns that reference this player
 */
export async function detachPlayerFromCollections(
  adminClient: AdminClient,
  playerId: string
): Promise<void> {
  const profilesTable = adminClient.from("profiles") as ReturnType<typeof adminClient.from>
  const { data: profiles, error: profilesError } = await profilesTable
    .select("id")
    .eq("player_id", playerId)

  if (profilesError) {
    throw new Error(profilesError.message)
  }

  const userIds = ((profiles ?? []) as Array<{ id: string }>).map((p) => p.id).filter(Boolean)

  if (userIds.length > 0) {
    const membersTable = adminClient.from("collection_members") as ReturnType<
      typeof adminClient.from
    >
    const { error: membersError } = await membersTable.delete().in("user_id", userIds)
    if (membersError) {
      throw new Error(membersError.message)
    }
  }

  const collectionsTable = adminClient.from("collections") as ReturnType<typeof adminClient.from>
  const fkColumns = [
    "photographer_id",
    "photo_lab_id",
    "handprint_lab_id",
    "retouch_studio_id",
  ] as const

  for (const column of fkColumns) {
    const { error } = await collectionsTable
      .update({ [column]: null } as never)
      .eq(column, playerId)
    if (error) {
      throw new Error(error.message)
    }
  }
}
