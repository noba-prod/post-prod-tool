/**
 * POST /api/notifications/[id]/read
 * Marks a notification as read
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService } from "@/lib/services/notifications"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationsService = new NotificationsService(supabase)
    await notificationsService.markAsRead(notificationId, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[POST /api/notifications/[id]/read] Error:", error)
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    )
  }
}
