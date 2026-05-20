import type { CollectionMemberRole } from "@/lib/supabase/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  sendCollectionAccessRevokedEmail,
} from "@/lib/email/send-collection-access-revoked"
import {
  buildInvitationContext,
  type CollectionRowForContext,
} from "@/lib/invitations/invitation-context"

const RESEND_RATE_LIMIT_DELAY_MS = 550
const NOBA_MEMBER_ROLE: CollectionMemberRole = "noba"

/** Metadata key on `collection_workflow_reconfigured` events (apply-workflow-change). */
export const EXTERNAL_MEMBER_SNAPSHOT_METADATA_KEY =
  "externalMemberUserIdsBeforeReconfig"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isExternalCollectionMemberRole(role: string): boolean {
  return role !== NOBA_MEMBER_ROLE
}

export function parseExternalMemberSnapshotFromMetadata(
  metadata: unknown
): string[] {
  if (!metadata || typeof metadata !== "object") return []
  const raw = (metadata as Record<string, unknown>)[EXTERNAL_MEMBER_SNAPSHOT_METADATA_KEY]
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0))]
}

export function computeRemovedExternalMemberUserIds(
  beforeUserIds: string[],
  afterUserIds: string[]
): string[] {
  const after = new Set(afterUserIds)
  return beforeUserIds.filter((id) => !after.has(id))
}

export async function fetchExternalMemberUserIds(
  collectionId: string,
  admin = createAdminClient()
): Promise<string[]> {
  const { data } = await admin
    .from("collection_members")
    .select("user_id, role")
    .eq("collection_id", collectionId)
  const members = (data ?? []) as { user_id: string; role: string }[]
  return [
    ...new Set(
      members
        .filter((m) => isExternalCollectionMemberRole(m.role))
        .map((m) => m.user_id)
    ),
  ]
}

export interface AccessRevokedNotifyResult {
  sent: number
  failed: number
  skipped: number
}

/**
 * Sends access-revoked emails to external users who are no longer collection members.
 */
export async function sendAccessRevokedEmailsForRemovedMembers(
  collectionId: string,
  removedUserIds: string[]
): Promise<AccessRevokedNotifyResult> {
  const uniqueIds = [...new Set(removedUserIds.filter(Boolean))]
  if (uniqueIds.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const admin = createAdminClient()
  const { data: collectionData, error: collError } = await admin
    .from("collections")
    .select(
      "id, client_id, name, status, shooting_start_date, shooting_end_date, publishing_date, shooting_city, shooting_country"
    )
    .eq("id", collectionId)
    .single()

  const collection = collectionData as CollectionRowForContext | null
  if (collError || !collection?.client_id) {
    console.warn(
      "[notify-removed-collection-members] Collection not found for access-revoked emails:",
      collectionId
    )
    return { sent: 0, failed: uniqueIds.length, skipped: 0 }
  }

  const { data: profilesData, error: profilesError } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", uniqueIds)
  const profiles = (profilesData ?? []) as Array<{ id: string; email: string | null }>

  if (profilesError) {
    console.warn(
      "[notify-removed-collection-members] Could not load profiles:",
      profilesError.message
    )
    return { sent: 0, failed: uniqueIds.length, skipped: 0 }
  }

  const invitationContext = await buildInvitationContext(admin, collection)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const profile of profiles) {
    const email = profile.email?.trim()
    if (!email) {
      skipped++
      continue
    }
    const result = await sendCollectionAccessRevokedEmail(email, invitationContext)
    if (result.sent) sent++
    else failed++
    await sleep(RESEND_RATE_LIMIT_DELAY_MS)
  }

  return { sent, failed, skipped }
}

/**
 * After republish following a structural workflow change, email external participants
 * who were members at reconfiguration time but are no longer invited.
 */
export async function notifyRemovedMembersAfterStructuralRepublish(
  collectionId: string
): Promise<AccessRevokedNotifyResult> {
  const admin = createAdminClient()

  let workflowRevision = 0
  {
    const { data: revRow, error: revErr } = await admin
      .from("collections")
      .select("workflow_revision")
      .eq("id", collectionId)
      .single()
    if (revErr) {
      const msg = (revErr as { message?: string }).message ?? ""
      if (!/workflow_revision/i.test(msg)) {
        console.warn(
          "[notify-removed-collection-members] workflow_revision read failed:",
          revErr
        )
      }
      return { sent: 0, failed: 0, skipped: 0 }
    }
    workflowRevision =
      (revRow as { workflow_revision?: number | null } | null)?.workflow_revision ?? 0
  }

  if (workflowRevision <= 0) {
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const { data: eventRow, error: eventErr } = await admin
    .from("collection_events")
    .select("metadata")
    .eq("collection_id", collectionId)
    .eq("event_type", "collection_workflow_reconfigured")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (eventErr) {
    console.warn(
      "[notify-removed-collection-members] Failed to load reconfig event:",
      eventErr
    )
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const snapshot = parseExternalMemberSnapshotFromMetadata(
    (eventRow as { metadata?: unknown } | null)?.metadata
  )
  if (snapshot.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const currentExternalIds = await fetchExternalMemberUserIds(collectionId, admin)
  const removedUserIds = computeRemovedExternalMemberUserIds(
    snapshot,
    currentExternalIds
  )

  return sendAccessRevokedEmailsForRemovedMembers(collectionId, removedUserIds)
}
