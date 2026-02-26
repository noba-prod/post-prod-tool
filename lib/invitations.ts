"use server"

import type { CollectionMember, CollectionMemberRole, Profile, UserRole } from "@/lib/supabase/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  sendInvitationEmail,
  type CollectionInvitationContext,
} from "@/lib/email/send-invitation"

/** Delay in ms to stay under Resend rate limit (2 requests per second). */
const RESEND_RATE_LIMIT_DELAY_MS = 550

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

type CollectionRowForContext = {
  id: string
  client_id: string
  name?: string | null
  status?: string
  shooting_start_date?: string | null
  shooting_end_date?: string | null
  publishing_date?: string | null
  shooting_city?: string | null
  shooting_country?: string | null
}

/** Build invitation email context from collection data. */
async function buildInvitationContext(
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
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", collection.client_id)
      .maybeSingle()
    clientName = (org as { name?: string | null } | null)?.name?.trim()
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

export interface CreateInvitationParams {
  /** Organization id (e.g. collection's client_id) for RLS and context */
  organizationId: string
  email: string
  /** When set, invitation is for this collection; on accept user is added to collection_members */
  collectionId?: string
  /** Role to assign in collection_members when invitation is accepted (required when collectionId is set) */
  invitedCollectionRole?: CollectionMemberRole
  /** Role to assign in profiles when invitation is org-only (platform/team invite). Default viewer. */
  role?: UserRole
  expiresInDays?: number
}

/**
 * Create a single invitation and store it in Supabase invitations table.
 * Use organizationId for org/RLS context; use collectionId + invitedCollectionRole for collection-scoped invites.
 */
export async function createInvitation(params: CreateInvitationParams) {
  const {
    organizationId,
    email,
    collectionId,
    invitedCollectionRole,
    role: invitedRole,
    expiresInDays = 7,
  } = params
  const supabase = createAdminClient()

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  try {
    const row: Record<string, unknown> = {
      organization_id: organizationId,
      email: email.toLowerCase().trim(),
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      role: invitedRole ?? "viewer",
    }
    if (collectionId) row.collection_id = collectionId
    if (invitedCollectionRole) row.invited_collection_role = invitedCollectionRole

    const { data: invitation, error: inviteError } = await (supabase.from("invitations") as any)
      .insert(row)
      .select()
      .single()

    if (inviteError) {
      return {
        success: false,
        error: inviteError.message || "Failed to create invitation",
      }
    }

    const siteUrl = process.env.SITE_URL || "http://localhost:3000"
    const activationUrl = `${siteUrl}/auth/activate?token=${token}`

    return {
      success: true,
      invitation,
      token,
      activationUrl,
    }
  } catch (error) {
    console.error("Create invitation error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

/**
 * Create invitations for all participants of a published collection.
 * Fetches collection_members, resolves emails from profiles, and inserts one invitation per member into Supabase.
 * Idempotent: skips creating a duplicate invitation for the same (email, collection_id).
 */
export async function createInvitationsForPublishedCollection(collectionId: string) {
  const supabase = createAdminClient()

  try {
    const { data: collectionData, error: collError } = await supabase
      .from("collections")
      .select(
        "id, client_id, name, status, shooting_start_date, shooting_end_date, publishing_date, shooting_city, shooting_country"
      )
      .eq("id", collectionId)
      .single()
    const collection = collectionData as CollectionRowForContext | null
    if (collError || !collection?.client_id) {
      return {
        success: false,
        error: "Collection not found or has no client",
        created: 0,
      }
    }

    const organizationId = collection.client_id
    const invitationContext = await buildInvitationContext(supabase, collection)

    const { data: membersData, error: membersError } = await supabase
      .from("collection_members")
      .select("user_id, role")
      .eq("collection_id", collectionId)
    const members = (membersData ?? []) as Pick<CollectionMember, "user_id" | "role">[]

    if (membersError) {
      return { success: false, error: membersError.message, created: 0 }
    }
    if (!members.length) {
      return { success: true, created: 0, message: "No participants to invite" }
    }

    const userIds = [...new Set(members.map((m) => m.user_id))]
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds)
    const profiles = (profilesData ?? []) as Pick<Profile, "id" | "email">[]

    if (profilesError || !profiles.length) {
      return {
        success: false,
        error: profilesError?.message ?? "Could not load participant emails",
        created: 0,
      }
    }

    const emailByUserId = new Map(profiles.map((p) => [p.id, p.email]))
    let created = 0
    let sent = 0

    for (const member of members) {
      const email = emailByUserId.get(member.user_id)?.trim()
      if (!email) continue

      const existing = await supabase
        .from("invitations")
        .select("id")
        .eq("collection_id", collectionId)
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .maybeSingle()

      if (existing.data) continue

      const result = await createInvitation({
        organizationId,
        email,
        collectionId,
        invitedCollectionRole: member.role,
        expiresInDays: 7,
      })
      if (result.success && result.activationUrl) {
        created++
        const emailResult = await sendInvitationEmail(email, result.activationUrl, {
          kind: "collection",
          context: invitationContext,
        })
        if (emailResult.sent) sent++
        await sleep(RESEND_RATE_LIMIT_DELAY_MS)
      }
    }

    return {
      success: true,
      created,
      sent,
      message: `Created ${created} invitation(s)${created > 0 ? `, ${sent} email(s) sent` : ""}`,
    }
  } catch (error) {
    console.error("Create invitations for collection error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
      created: 0,
    }
  }
}

/**
 * Create invitations and send emails only for the given (new) members.
 * Use when participants are updated (e.g. photographer changed) - invite only new users.
 * Idempotent: skips creating a duplicate invitation for the same (email, collection_id).
 */
export async function createInvitationsForNewMembers(
  collectionId: string,
  members: Pick<CollectionMember, "user_id" | "role">[]
) {
  const supabase = createAdminClient()

  try {
    const { data: collectionData, error: collError } = await supabase
      .from("collections")
      .select(
        "id, client_id, name, status, shooting_start_date, shooting_end_date, publishing_date, shooting_city, shooting_country"
      )
      .eq("id", collectionId)
      .single()
    const collection = collectionData as CollectionRowForContext | null
    if (collError || !collection?.client_id) {
      return {
        success: false,
        error: "Collection not found or has no client",
        created: 0,
      }
    }

    const organizationId = collection.client_id
    if (members.length === 0) {
      return { success: true, created: 0, sent: 0 }
    }

    const invitationContext = await buildInvitationContext(supabase, collection)

    const userIds = [...new Set(members.map((m) => m.user_id))]
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds)
    const profiles = (profilesData ?? []) as Pick<Profile, "id" | "email">[]

    if (profilesError || !profiles.length) {
      return {
        success: false,
        error: profilesError?.message ?? "Could not load participant emails",
        created: 0,
      }
    }

    const emailByUserId = new Map(profiles.map((p) => [p.id, p.email]))
    let created = 0
    let sent = 0

    for (const member of members) {
      const email = emailByUserId.get(member.user_id)?.trim()
      if (!email) continue

      const existing = await supabase
        .from("invitations")
        .select("id")
        .eq("collection_id", collectionId)
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .maybeSingle()

      if (existing.data) continue

      const result = await createInvitation({
        organizationId,
        email,
        collectionId,
        invitedCollectionRole: member.role,
        expiresInDays: 7,
      })
      if (result.success && result.activationUrl) {
        created++
        const emailResult = await sendInvitationEmail(email, result.activationUrl, {
          kind: "collection",
          context: invitationContext,
        })
        if (emailResult.sent) sent++
        await sleep(RESEND_RATE_LIMIT_DELAY_MS)
      }
    }

    return {
      success: true,
      created,
      sent,
      message: created > 0 ? `Created ${created} invitation(s), ${sent} email(s) sent to new participants` : undefined,
    }
  } catch (error) {
    console.error("Create invitations for new members error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
      created: 0,
    }
  }
}
