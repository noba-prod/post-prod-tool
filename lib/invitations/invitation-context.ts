import { createAdminClient } from "@/lib/supabase/admin"
import type { CollectionInvitationContext } from "@/lib/email/send-invitation"

/** Format ISO date for email display (e.g. "15 Jan 2025"). */
function formatDateForEmail(isoDate: string | null | undefined): string | undefined {
  if (!isoDate?.trim()) return undefined
  try {
    const d = new Date(isoDate)
    if (Number.isNaN(d.getTime())) return undefined
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return undefined
  }
}

export type CollectionRowForContext = {
  id: string
  client_id: string
  name?: string | null
  status?: string
  shooting_start_date?: string | null
  shooting_end_date?: string | null
  publishing_date?: string | null
  shooting_city?: string | null
  shooting_country?: string | null
  /**
   * Incremented by `/api/collections/[id]/apply-workflow-change` every time
   * a structural workflow reconfiguration is applied. When `> 0` the next
   * publish event is a republish-after-reconfiguration and the invitation
   * email must be reworded.
   */
  workflow_revision?: number | null
}

/** Build invitation email context from collection data. */
export async function buildInvitationContext(
  supabase: ReturnType<typeof createAdminClient>,
  collection: CollectionRowForContext
): Promise<CollectionInvitationContext> {
  const collectionName = collection.name?.trim() ?? "a collection"
  const status = collection.status
  const statusDisplay =
    status === "upcoming"
      ? "Upcoming"
      : status === "in_progress"
        ? "In progress"
        : undefined

  const shootingStartDate = formatDateForEmail(collection.shooting_start_date)
  const shootingEndDate = formatDateForEmail(collection.shooting_end_date)
  const publishingDate = formatDateForEmail(collection.publishing_date)

  const city = collection.shooting_city?.trim()
  const country = collection.shooting_country?.trim()
  const location =
    city || country ? [city, country].filter(Boolean).join(", ") : undefined

  let clientName: string | undefined
  if (collection.client_id) {
    const { data: player } = await supabase
      .from("players")
      .select("name")
      .eq("id", collection.client_id)
      .maybeSingle()
    clientName = (player as { name?: string | null } | null)?.name?.trim()
  }

  let creatorName: string | undefined
  const { data: ownerMember } = await supabase
    .from("collection_members")
    .select("user_id")
    .eq("collection_id", collection.id)
    .eq("role", "noba")
    .eq("is_owner", true)
    .maybeSingle()

  if (ownerMember) {
    const ownerUserId = (ownerMember as { user_id?: string }).user_id
    if (ownerUserId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", ownerUserId)
        .maybeSingle()
      const fn = (profile as { first_name?: string | null } | null)?.first_name?.trim()
      const ln = (profile as { last_name?: string | null } | null)?.last_name?.trim()
      creatorName = [fn, ln].filter(Boolean).join(" ") || undefined
    }
  }

  return {
    collectionName,
    creatorName,
    clientName,
    statusDisplay,
    shootingStartDate,
    shootingEndDate,
    publishingDate,
    location,
  }
}
