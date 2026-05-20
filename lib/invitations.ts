"use server"

import type { CollectionMember, CollectionMemberRole, Profile, UserRole } from "@/lib/supabase/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendInvitationEmail } from "@/lib/email/send-invitation"
import {
  buildInvitationContext,
  type CollectionRowForContext,
} from "@/lib/invitations/invitation-context"

/** Delay in ms to stay under Resend rate limit (2 requests per second). */
const RESEND_RATE_LIMIT_DELAY_MS = 550

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface CreateInvitationParams {
  /** Player id (e.g. collection's client_id) for RLS and context */
  playerId: string
  email: string
  /** When set, invitation is for this collection; on accept user is added to collection_members */
  collectionId?: string
  /** Role to assign in collection_members when invitation is accepted (required when collectionId is set) */
  invitedCollectionRole?: CollectionMemberRole
  /** Role to assign in profiles when invitation is player-only (platform/team invite). Default viewer. */
  role?: UserRole
  expiresInDays?: number
}

/**
 * Create a single invitation and store it in Supabase invitations table.
 * Use playerId for player/RLS context; use collectionId + invitedCollectionRole for collection-scoped invites.
 */
export async function createInvitation(params: CreateInvitationParams) {
  const {
    playerId,
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
      player_id: playerId,
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
    // Try to include `workflow_revision` for the reconfigured-intent gate;
    // fall back gracefully when the column does not exist yet (e.g. migration
    // 083 not applied on this remote DB) so we never break the publish path.
    let collection: CollectionRowForContext | null = null
    let collError: { message?: string } | null = null
    {
      const withRevision = await supabase
        .from("collections")
        .select(
          "id, client_id, name, status, shooting_start_date, shooting_end_date, publishing_date, shooting_city, shooting_country, workflow_revision"
        )
        .eq("id", collectionId)
        .single()
      if (withRevision.error) {
        const msg = (withRevision.error as { message?: string }).message ?? ""
        if (/workflow_revision/i.test(msg) || /column .* does not exist/i.test(msg)) {
          const legacy = await supabase
            .from("collections")
            .select(
              "id, client_id, name, status, shooting_start_date, shooting_end_date, publishing_date, shooting_city, shooting_country"
            )
            .eq("id", collectionId)
            .single()
          collection = legacy.data as CollectionRowForContext | null
          collError = legacy.error as { message?: string } | null
        } else {
          collError = withRevision.error as { message?: string }
        }
      } else {
        collection = withRevision.data as CollectionRowForContext | null
      }
    }
    if (collError || !collection?.client_id) {
      return {
        success: false,
        error: "Collection not found or has no client",
        created: 0,
      }
    }

    const playerId = collection.client_id
    const invitationContext = await buildInvitationContext(supabase, collection)
    // Republish after a structural workflow change → reword the email instead
    // of pitching it as a brand-new invitation. The activation token plumbing
    // stays identical; only subject + body copy switch (see send-invitation.ts).
    const emailIntent: "invite" | "reconfigured" =
      (collection.workflow_revision ?? 0) > 0 ? "reconfigured" : "invite"

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
        playerId,
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
          intent: emailIntent,
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

    const playerId = collection.client_id
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
        playerId,
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
