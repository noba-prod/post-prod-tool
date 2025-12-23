"use server"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Create an invitation for a collection
 * This should be called from server-side/admin context
 */
export async function createInvitation(
  collectionId: string,
  email: string,
  expiresInDays: number = 7
) {
  const supabase = createAdminClient()

  // Generate secure token (using Web Crypto API for server-side)
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  try {
    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .insert({
        collection_id: collectionId,
        email: email.toLowerCase().trim(),
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      return {
        success: false,
        error: inviteError.message || "Failed to create invitation",
      }
    }

    // Optionally create user in Supabase Auth (uncomment if needed)
    // const { data: user, error: userError } = await supabase.auth.admin.createUser({
    //   email: email.toLowerCase().trim(),
    //   email_confirm: false,
    // })

    // Generate activation URL
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

