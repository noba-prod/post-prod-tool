/**
 * POST /api/collections/[id]/check-missed-deadlines
 * Detects missed deadlines for this collection and fires *_deadline_missed events if needed.
 * Called when viewing a collection so notifications fire even without the cron (e.g. in dev).
 * Idempotent: skips if event already exists.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NotificationsService } from "@/lib/services/notifications"
import { checkInternalUserCollectionMutationScope } from "@/lib/services/collections/internal-scope-guard"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scope = await checkInternalUserCollectionMutationScope(user.id, collectionId)
    if (!scope.canMutate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const notificationsService = new NotificationsService(adminClient)
    const result = await notificationsService.detectAndFireMissedDeadlinesForCollection(collectionId)

    return NextResponse.json({ success: true, fired: result.fired })
  } catch (error) {
    console.error("[check-missed-deadlines] Error:", error)
    return NextResponse.json(
      { error: "Failed to check missed deadlines" },
      { status: 500 }
    )
  }
}
