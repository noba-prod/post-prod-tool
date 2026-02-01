/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the current user
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService } from "@/lib/services/notifications"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationsService = new NotificationsService(supabase)
    const count = await notificationsService.getUnreadCount(user.id)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("[GET /api/notifications/unread-count] Error:", error)
    return NextResponse.json(
      { error: "Failed to get unread count" },
      { status: 500 }
    )
  }
}
