/**
 * GET /api/notifications
 * Returns the current user's in-app notifications
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService } from "@/lib/services/notifications"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50

    const notificationsService = new NotificationsService(supabase)
    const notifications = await notificationsService.getUserNotifications(user.id, {
      unreadOnly,
      limit,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}
