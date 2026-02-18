"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Invitation, ProfileInsert } from "@/lib/supabase/database.types"
import { revalidatePath } from "next/cache"

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
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  try {
    // Find invitation (cast: Supabase client can infer never in build)
    const { data: invitationData, error: inviteError } = await supabase
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
      // Update status to expired (cast: Supabase client can infer never in build)
      await (supabase.from("invitations") as any).update({ status: "expired" }).eq("id", invitation.id)

      return {
        success: false,
        error: "Invitation has expired",
      }
    }

    // Check if user exists
    // Note: getUserByEmail doesn't exist in Supabase v2, use listUsers with filter instead
    const { data: users } = await adminSupabase.auth.admin.listUsers()
    const existingUser = users.users.find((u) => u.email === invitation.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create user via admin API
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: invitation.email,
        email_confirm: false, // User must verify email
      })

      if (createError || !newUser.user) {
        return {
          success: false,
          error: "Failed to create user account",
        }
      }

      userId = newUser.user.id
    }

    // Update invitation (cast: Supabase client can infer never in build)
    const { error: updateError } = await (supabase.from("invitations") as any)
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId,
      })
      .eq("id", invitation.id)

    if (updateError) {
      console.error("Update invitation error:", updateError)
    }

    // Org-only (platform/team) invite: resolve organization type for is_internal
    const collectionId = invitation.collection_id
    let isInternal = false
    const orgId = invitation.organization_id
    const invitationRole = invitation.role ?? "viewer"
    if (!collectionId && orgId) {
      const { data: org } = await adminSupabase
        .from("organizations")
        .select("type")
        .eq("id", orgId)
        .maybeSingle()
      isInternal = (org as { type?: string } | null)?.type === "noba"
    }

    // Ensure profile exists; for org-only invite set organization_id, role, is_internal
    const profilePayload: Record<string, unknown> = {
      id: userId,
      email: invitation.email,
      is_internal: collectionId ? false : isInternal,
    }
    if (!collectionId && orgId) {
      profilePayload.organization_id = orgId
      profilePayload.role = invitationRole
    }
    const { error: profileError } = await (adminSupabase.from("profiles") as any).upsert(profilePayload as Record<string, string | boolean | null>, {
      onConflict: "id",
    })

    if (profileError) {
      console.error("Profile upsert error:", profileError)
    }

    // Add user to collection when invitation is collection-scoped
    const invitedRole = invitation.invited_collection_role ?? "client"
    if (collectionId) {
      const { error: memberError } = await (supabase.from("collection_members") as any)
        .insert({
          collection_id: collectionId,
          user_id: userId,
          role: invitedRole,
        })
        .select()
        .single()

      if (memberError) {
        if (memberError.code !== "23505") {
          console.error("Collection member error:", memberError)
        }
      }
    }

    // Send email verification if not verified
    const { data: userData } = await adminSupabase.auth.admin.getUserById(userId)
    if (userData && userData.user && !userData.user.email_confirmed_at) {
      // Trigger email verification
      // Note: generateLink requires password for signup type, but we're using passwordless auth
      // In production, use magic link or OTP flow instead
      try {
        await adminSupabase.auth.admin.generateLink({
          type: "magiclink",
          email: invitation.email,
        })
      } catch (error) {
        console.error("Failed to generate verification link:", error)
      }
    }

    revalidatePath("/")
    return {
      success: true,
      email: invitation.email,
      needsVerification: !userData.user?.email_confirmed_at,
    }
  } catch (error) {
    console.error("Activate invitation error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

