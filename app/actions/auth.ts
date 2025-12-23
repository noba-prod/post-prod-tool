"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
    const { data, error } = await supabase.rpc("check_email_allowed", {
      email_to_check: email.toLowerCase().trim(),
    })

    if (error) {
      console.error("Precheck error:", error)
      return { allowed: false, reason: "error" }
    }

    const result = data as { allowed: boolean; reason?: string }
    return {
      allowed: result.allowed,
      reason: result.reason as PrecheckResult["reason"] || "not_invited",
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

    // Ensure profile exists
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || null,
        }, {
          onConflict: "id",
        })

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
    // Find invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single()

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
      // Update status to expired
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)

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

    // Update invitation
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId,
      })
      .eq("id", invitation.id)

    if (updateError) {
      console.error("Update invitation error:", updateError)
    }

    // Ensure profile exists
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: invitation.email,
        is_internal: false,
      }, {
        onConflict: "id",
      })

    if (profileError) {
      console.error("Profile upsert error:", profileError)
    }

    // Add user to collection
    const { error: memberError } = await supabase
      .from("collection_members")
      .insert({
        collection_id: invitation.collection_id,
        user_id: userId,
        role: "member",
      })
      .select()
      .single()

    if (memberError) {
      // Check if already a member
      if (memberError.code !== "23505") {
        console.error("Collection member error:", memberError)
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

