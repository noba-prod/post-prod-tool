/**
 * POST /api/collections/[id]/publish
 * Publishes a collection (server-side), schedules time-based notifications, creates invitations and sends emails.
 * Runs with admin Supabase so scheduled_notification_tracking is populated and RESEND_API_KEY is available for emails.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"
import { createInvitationsForPublishedCollection } from "@/lib/invitations"
import { CollectionsServiceError } from "@/lib/services/collections"
import { checkInternalUserCollectionMutationScope } from "@/lib/services/collections/internal-scope-guard"

export async function POST(
  _request: NextRequest,
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

    const scope = await checkInternalUserCollectionMutationScope(user.id, id)
    if (!scope.canMutate) {
      return NextResponse.json(
        { error: "Forbidden: internal users must be invited to edit this collection." },
        { status: 403 }
      )
    }

    // Publish collection and run notifications (scheduled_notification_tracking) with admin client.
    // When status becomes in_progress, a shooting_started event is recorded.
    const service = createCollectionsServiceForServer()
    try {
      await service.publishCollection(id, new Date(), user.id)
    } catch (err) {
      if (err instanceof CollectionsServiceError) {
        const status =
          err.code === "NOT_FOUND"
            ? 404
            : err.code === "DRAFT_INCOMPLETE"
              ? 400
              : 500
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status }
        )
      }
      throw err
    }

    // Create invitations and send emails (server-side so RESEND_API_KEY is available)
    const inviteResult = await createInvitationsForPublishedCollection(id)

    return NextResponse.json({
      success: true,
      invitationsCreated: inviteResult.created ?? 0,
      invitationsSent: inviteResult.sent ?? 0,
      message: inviteResult.message,
      error: inviteResult.success ? undefined : inviteResult.error,
    })
  } catch (error) {
    console.error("[POST /api/collections/[id]/publish] Error:", error)
    return NextResponse.json(
      { error: "Failed to publish collection" },
      { status: 500 }
    )
  }
}
