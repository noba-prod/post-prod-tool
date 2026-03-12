import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService } from "@/lib/services/notifications"

interface MarkReadByContextBody {
  collectionId?: string
  stepId?: string
}

/**
 * POST /api/notifications/read-by-context
 * Marks in-app notifications as read by collection + optional step context.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as MarkReadByContextBody
    const collectionId = body.collectionId?.trim()
    const stepId = body.stepId?.trim()

    if (!collectionId) {
      return NextResponse.json({ error: "collectionId is required" }, { status: 400 })
    }

    const notificationsService = new NotificationsService(supabase)
    const markedCount = await notificationsService.markAsReadByContext(
      user.id,
      collectionId,
      stepId
    )

    return NextResponse.json({ success: true, markedCount })
  } catch (error) {
    console.error("[POST /api/notifications/read-by-context] Error:", error)
    return NextResponse.json(
      { error: "Failed to mark notifications as read by context" },
      { status: 500 }
    )
  }
}
