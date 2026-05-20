"use server"

import { createInvitation } from "@/lib/invitations"
import { sendInvitationEmail } from "@/lib/email/send-invitation"
import type { UserRole } from "@/lib/supabase/database.types"

export type CreateTeamMemberInvitationResult =
  | { success: true; message: string }
  | { success: false; error: string }

/**
 * Create a platform invitation for a new team member (noba* / internal player).
 * Stores the invitation in Supabase and sends an email with an activation link.
 * When the user accepts, they are added to the player with the given role and is_internal set as appropriate.
 */
export async function createTeamMemberInvitation(
  playerId: string,
  email: string,
  role: UserRole
): Promise<CreateTeamMemberInvitationResult> {
  try {
    const result = await createInvitation({
      playerId,
      email: email.trim().toLowerCase(),
      role,
      expiresInDays: 7,
    })

    if (!result.success || !result.activationUrl) {
      return {
        success: false,
        error: result.error ?? "Failed to create invitation",
      }
    }

    const emailResult = await sendInvitationEmail(email.trim(), result.activationUrl, {
      kind: "platform",
      collectionName: "noba*",
    })

    if (!emailResult.sent) {
      return {
        success: false,
        error: emailResult.error ?? "Invitation created but email could not be sent",
      }
    }

    return {
      success: true,
      message: "Invitation sent. They will appear in the team once they accept.",
    }
  } catch (error) {
    console.error("Create team member invitation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
