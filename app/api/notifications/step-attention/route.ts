import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService } from "@/lib/services/notifications"

/**
 * GET /api/notifications/step-attention?collectionId=...
 * Returns step IDs with unread in-app notification activity for this user/collection.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const collectionId = request.nextUrl.searchParams.get("collectionId")?.trim()
    if (!collectionId) {
      return NextResponse.json({ error: "collectionId is required" }, { status: 400 })
    }

    const notificationsService = new NotificationsService(supabase)
    const stepIds = await notificationsService.getUnreadStepIdsForCollection(user.id, collectionId)

    return NextResponse.json({ stepIds })
  } catch (error) {
    console.error("[GET /api/notifications/step-attention] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch step attention data" },
      { status: 500 }
    )
  }
}
