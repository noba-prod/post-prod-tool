import type { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>

export async function listUserIdsForPlayer(
  adminClient: AdminClient,
  playerId: string
): Promise<string[]> {
  const profilesTable = adminClient.from("profiles") as ReturnType<typeof adminClient.from>
  const { data, error } = await profilesTable.select("id").eq("player_id", playerId)
  if (error) {
    throw new Error(error.message)
  }
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id).filter(Boolean)
}

/**
 * Removes Auth logins for the given profile ids.
 * Deleting auth.users cascades public.profiles (ON DELETE CASCADE).
 * Missing users are ignored so a retry after a partial purge still succeeds.
 */
export async function deleteAuthUsersByIds(
  adminClient: AdminClient,
  userIds: string[]
): Promise<void> {
  const failures: string[] = []
  for (const userId of userIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (!error) continue
    const message = error.message.toLowerCase()
    if (message.includes("not found") || message.includes("user not found")) continue
    failures.push(`${userId}: ${error.message}`)
  }
  if (failures.length > 0) {
    throw new Error(failures.join("; "))
  }
}
