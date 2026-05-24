"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Invitation, ProfileInsert } from "@/lib/supabase/database.types"
import { revalidatePath } from "next/cache"

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/** Resolve auth user id by email — profiles first, then paginated Auth admin list. */
async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const adminSupabase = createAdminClient()
  const normalized = normalizeEmail(email)

  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle()
  const profileRow = profileData as { id: string } | null

  if (profileRow?.id) {
    return profileRow.id
  }

  let page = 1
  const perPage = 1000
  while (page <= 20) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break

    const match = data.users.find(
      (u) => normalizeEmail(u.email ?? "") === normalized
    )
    if (match?.id) return match.id

    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

function isDuplicateAuthUserError(message: string | undefined): boolean {
  const msg = (message ?? "").toLowerCase()
  return (
    msg.includes("already") ||
    msg.includes("exists") ||
    msg.includes("registered") ||
    msg.includes("duplicate")
  )
}

/** Find existing auth user or create one for invitation activation. */
async function ensureAuthUserForInvitation(
  email: string
): Promise<{ userId: string } | { error: string }> {
  const adminSupabase = createAdminClient()
  const normalized = normalizeEmail(email)

  const existingId = await resolveUserIdByEmail(normalized)
  if (existingId) {
    return { userId: existingId }
  }

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email: normalized,
    email_confirm: false,
  })

  if (!createError && newUser.user?.id) {
    return { userId: newUser.user.id }
  }

  if (isDuplicateAuthUserError(createError?.message)) {
    const resolvedId = await resolveUserIdByEmail(normalized)
    if (resolvedId) {
      return { userId: resolvedId }
    }
  }

  console.error("ensureAuthUserForInvitation createUser error:", createError?.message)
  return { error: "Failed to create user account" }
}

export type PrecheckResult = {
  allowed: boolean
  reason?: "ok" | "not_invited" | "not_verified" | "error"
}

/**
 * Precheck if email is allowed to request OTP
 */
export async function precheckEmail(email: string): Promise<PrecheckResult> {
  const supabase = await createClient()
  
  try {
    // @ts-expect-error Supabase generated types may not include RPC args for check_email_precheck
    const { data, error } = await supabase.rpc("check_email_precheck", {
      check_email: email.toLowerCase().trim(),
    })

    if (error) {
      console.error("Precheck error:", error)
      return { allowed: false, reason: "error" }
    }

    const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean; reason?: string } | null
    const allowed = row?.allowed ?? false
    return {
      allowed,
      reason: allowed ? "ok" : (row?.reason as PrecheckResult["reason"]) || "not_invited",
    }
  } catch (error) {
    console.error("Precheck exception:", error)
    return { allowed: false, reason: "error" }
  }
}

/**
 * Request OTP for email
 */
export async function requestOTP(email: string) {
  const supabase = await createClient()
  
  // First check if email is allowed
  const precheck = await precheckEmail(email)
  if (!precheck.allowed) {
    return {
      success: false,
      error: precheck.reason === "not_verified" 
        ? "Please verify your email before requesting OTP"
        : precheck.reason === "not_invited"
        ? "You need to be invited to access this platform"
        : "Unable to process request",
    }
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to send OTP",
      }
    }

    return {
      success: true,
      message: "OTP sent to your email",
    }
  } catch (error) {
    console.error("Request OTP error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(email: string, token: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token,
      type: "email",
    })

    if (error) {
      return {
        success: false,
        error: error.message || "Invalid or expired OTP",
      }
    }

    // Ensure profile exists (profiles table uses first_name/last_name, not full_name)
    if (data.user) {
      const fullName = (data.user.user_metadata?.full_name as string) || ""
      const parts = fullName.trim().split(/\s+/)
      const firstName = parts[0] ?? null
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null
      const profileRow: ProfileInsert = {
        id: data.user.id,
        email: data.user.email!,
        first_name: firstName,
        last_name: lastName,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client can infer upsert(never) in build; runtime types are correct
      const { error: profileError } = await (supabase.from("profiles") as any).upsert(profileRow, { onConflict: "id" })

      if (profileError) {
        console.error("Profile upsert error:", profileError)
      }
    }

    revalidatePath("/")
    return {
      success: true,
      user: data.user,
    }
  } catch (error) {
    console.error("Verify OTP error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

/**
 * Activate invitation token
 */
export async function activateInvitation(token: string) {
  const adminSupabase = createAdminClient()

  try {
    // Token lookup: anon SELECT is allowed by RLS; admin avoids edge-case policy gaps.
    const { data: invitationData, error: inviteError } = await adminSupabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single()
    const invitation = invitationData as Invitation | null

    if (inviteError || !invitation) {
      return {
        success: false,
        error: "Invalid or expired invitation",
      }
    }

    if (invitation.status !== "pending") {
      return {
        success: false,
        error: "Invitation has already been used or revoked",
      }
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await (adminSupabase.from("invitations") as any)
        .update({ status: "expired" })
        .eq("id", invitation.id)

      return {
        success: false,
        error: "Invitation has expired",
      }
    }

    const ensured = await ensureAuthUserForInvitation(invitation.email)
    if ("error" in ensured) {
      return {
        success: false,
        error: ensured.error,
      }
    }

    const userId = ensured.userId

    const { error: updateError } = await (adminSupabase.from("invitations") as any)
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId,
      })
      .eq("id", invitation.id)

    if (updateError) {
      console.error("Update invitation error:", updateError)
      return {
        success: false,
        error: "Failed to accept invitation",
      }
    }

    // Player-only (platform/team) invite: resolve player type for is_internal
    const collectionId = invitation.collection_id
    let isInternal = false
    const playerId = invitation.player_id
    const invitationRole = invitation.role ?? "viewer"
    if (!collectionId && playerId) {
      const { data: player } = await adminSupabase
        .from("players")
        .select("type")
        .eq("id", playerId)
        .maybeSingle()
      isInternal = (player as { type?: string } | null)?.type === "noba"
    }

    // Ensure profile exists; for player-only invite set player_id/role.
    // Never write is_internal=false here: internal users must keep that flag forever.
    const profilePayload: Record<string, unknown> = {
      id: userId,
      email: normalizeEmail(invitation.email),
    }
    if (!collectionId && playerId) {
      profilePayload.player_id = playerId
      profilePayload.role = invitationRole
      if (isInternal) {
        profilePayload.is_internal = true
      }
    }
    const { error: profileError } = await (adminSupabase.from("profiles") as any).upsert(
      profilePayload as Record<string, string | boolean | null>,
      { onConflict: "id" }
    )

    if (profileError) {
      console.error("Profile upsert error:", profileError)
    }

    // Add user to collection when invitation is collection-scoped
    const invitedRole = invitation.invited_collection_role ?? "client"
    if (collectionId) {
      const { error: memberError } = await (adminSupabase.from("collection_members") as any).insert({
        collection_id: collectionId,
        user_id: userId,
        role: invitedRole,
      })

      if (memberError && memberError.code !== "23505") {
        console.error("Collection member error:", memberError)
      }
    }

    // Send email verification if not verified
    const { data: userData } = await adminSupabase.auth.admin.getUserById(userId)
    if (userData?.user && !userData.user.email_confirmed_at) {
      try {
        await adminSupabase.auth.admin.generateLink({
          type: "magiclink",
          email: normalizeEmail(invitation.email),
        })
      } catch (error) {
        console.error("Failed to generate verification link:", error)
      }
    }

    revalidatePath("/")
    return {
      success: true,
      email: normalizeEmail(invitation.email),
      needsVerification: !userData?.user?.email_confirmed_at,
    }
  } catch (error) {
    console.error("Activate invitation error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

