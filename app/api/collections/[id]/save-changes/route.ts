/**
 * POST /api/collections/[id]/save-changes
 * Saves config + participants for a published collection (edition mode).
 * Invites only NEW participants by email (server-side, RESEND_API_KEY).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"
import { createInvitationsForNewMembers } from "@/lib/invitations"
import { CollectionsServiceError } from "@/lib/services/collections"
import type { CollectionConfig, CollectionParticipant } from "@/lib/domain/collections"
import type { CollectionMember } from "@/lib/supabase/database.types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null) as {
      config?: CollectionConfig
      participants?: CollectionParticipant[]
    } | null
    if (!body?.config || !body?.participants) {
      return NextResponse.json(
        { error: "config and participants are required" },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Fetch current members BEFORE update (to compute new users)
    const { data: oldMembersData } = await (admin.from("collection_members") as ReturnType<typeof admin.from>)
      .select("user_id, role")
      .eq("collection_id", id)
    const oldMembers = (oldMembersData ?? []) as { user_id: string; role: string }[]
    const oldUserIds = new Set(oldMembers.map((m) => m.user_id))

    const service = createCollectionsServiceForServer()
    try {
      await service.updateCollection(id, {
        config: body.config,
        participants: body.participants,
      })
    } catch (err) {
      if (err instanceof CollectionsServiceError) {
        const status = err.code === "NOT_FOUND" ? 404 : 500
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status }
        )
      }
      throw err
    }

    // Fetch new members (after update) and compute who is new
    const { data: newMembersData } = await (admin.from("collection_members") as ReturnType<typeof admin.from>)
      .select("user_id, role")
      .eq("collection_id", id)
    const newMembers = (newMembersData ?? []) as { user_id: string; role: string }[]
    const newMembersToInvite = newMembers.filter((m) => !oldUserIds.has(m.user_id)) as Pick<
      CollectionMember,
      "user_id" | "role"
    >[]

    let invitationsCreated = 0
    let invitationsSent = 0
    if (newMembersToInvite.length > 0) {
      const inviteResult = await createInvitationsForNewMembers(id, newMembersToInvite)
      invitationsCreated = inviteResult.created ?? 0
      invitationsSent = inviteResult.sent ?? 0
    }

    const message =
      newMembersToInvite.length > 0 && invitationsCreated > 0
        ? `Changes saved. ${invitationsCreated} invitation(s) sent to new participants.`
        : "Changes saved."

    return NextResponse.json({
      success: true,
      invitationsCreated,
      invitationsSent,
      message,
    })
  } catch (error) {
    console.error("[POST /api/collections/[id]/save-changes] Error:", error)
    return NextResponse.json(
      { error: "Failed to save changes" },
      { status: 500 }
    )
  }
}
