"use server"

import type { Collection, CollectionMember, CollectionMemberRole, Profile, UserRole } from "@/lib/supabase/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendInvitationEmail } from "@/lib/email/send-invitation"

/** Delay in ms to stay under Resend rate limit (2 requests per second). */
const RESEND_RATE_LIMIT_DELAY_MS = 550

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
      .select("id, client_id, name")
      .eq("id", collectionId)
      .single()
    const collection = collectionData as Pick<Collection, "id" | "client_id" | "name"> | null

    if (collError || !collection?.client_id) {
      return {
        success: false,
        error: "Collection not found or has no client",
        created: 0,
      }
    }

    const organizationId = collection.client_id

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
    const collectionName = (collection as { name?: string | null }).name ?? "a collection"
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
        const emailResult = await sendInvitationEmail(
          email,
          result.activationUrl,
          collectionName
        )
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

