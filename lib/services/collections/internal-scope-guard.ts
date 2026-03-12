import { createAdminClient } from "@/lib/supabase/admin"

export interface InternalScopeCheckResult {
  isInternal: boolean
  isInternalAdmin: boolean
  isInvitedMember: boolean
  canMutate: boolean
}

/**
 * Scope guard for internal users:
 * - Non-internal users are not affected by this guard.
 * - Internal users can mutate a collection only if invited (row exists in collection_members).
 */
export async function checkInternalUserCollectionMutationScope(
  userId: string,
  collectionId: string
): Promise<InternalScopeCheckResult> {
  const admin = createAdminClient()
  type ProfileScopeRow = { is_internal: boolean | null; role: string | null }
  type MemberScopeRow = { id: string }

  const profilesTable = admin.from("profiles") as ReturnType<typeof admin.from>
  const { data: profile } = await profilesTable
    .select("is_internal, role")
    .eq("id", userId)
    .single()
  const profileRow = (profile as ProfileScopeRow | null) ?? null

  const isInternal = profileRow?.is_internal === true
  const isInternalAdmin =
    isInternal &&
    String(profileRow?.role ?? "").toLowerCase() === "admin"

  if (isInternalAdmin) {
    return {
      isInternal: true,
      isInternalAdmin: true,
      isInvitedMember: true,
      canMutate: true,
    }
  }

  if (!isInternal) {
    return {
      isInternal: false,
      isInternalAdmin: false,
      isInvitedMember: true,
      canMutate: true,
    }
  }

  const membersTable = admin.from("collection_members") as ReturnType<typeof admin.from>
  const { data: member } = await membersTable
    .select("id")
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .maybeSingle()
  const memberRow = (member as MemberScopeRow | null) ?? null

  const isInvitedMember = Boolean(memberRow?.id)
  return {
    isInternal: true,
    isInternalAdmin: false,
    isInvitedMember,
    canMutate: isInvitedMember,
  }
}
