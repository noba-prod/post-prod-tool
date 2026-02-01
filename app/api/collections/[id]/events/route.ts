/**
 * POST /api/collections/[id]/events
 * Triggers a collection event and processes associated notifications
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService, type CollectionEventType } from "@/lib/services/notifications"

const VALID_EVENT_TYPES: CollectionEventType[] = [
  "shooting_started",
  "shooting_ended",
  "negatives_pickup_marked",
  "dropoff_confirmed",
  "dropoff_deadline_missed",
  "scanning_started",
  "scanning_completed",
  "scanning_deadline_missed",
  "photographer_selection_uploaded",
  "photographer_selection_shared",
  "photographer_selection_deadline_missed",
  "client_selection_started",
  "client_selection_confirmed",
  "client_selection_deadline_missed",
  "highres_started",
  "highres_ready",
  "highres_deadline_missed",
  "edition_request_submitted",
  "edition_request_deadline_missed",
  "final_edits_started",
  "final_edits_completed",
  "final_edits_deadline_missed",
  "photographer_review_started",
  "photographer_edits_approved",
  "photographer_review_deadline_missed",
  "collection_completed",
  "collection_cancelled",
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { eventType, metadata } = body as {
      eventType: string
      metadata?: Record<string, unknown>
    }

    // Validate event type
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType as CollectionEventType)) {
      return NextResponse.json(
        { error: `Invalid event type: ${eventType}` },
        { status: 400 }
      )
    }

    // Verify collection exists and user has access
    const { data: collection, error: collectionError } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    // Trigger the event
    const notificationsService = new NotificationsService(supabase)
    await notificationsService.triggerEvent(
      collectionId,
      eventType as CollectionEventType,
      user.id,
      metadata
    )

    return NextResponse.json({ success: true, eventType })
  } catch (error) {
    console.error("[POST /api/collections/[id]/events] Error:", error)
    return NextResponse.json(
      { error: "Failed to trigger event" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collections/[id]/events
 * Returns the event history for a collection
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch events
    const { data: events, error: eventsError } = await supabase
      .from("collection_events")
      .select(`
        id,
        event_type,
        metadata,
        created_at,
        triggered_by_user_id,
        profiles!triggered_by_user_id(first_name, last_name)
      `)
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (eventsError) {
      console.error("[GET /api/collections/[id]/events] Error:", eventsError)
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      )
    }

    return NextResponse.json({ events })
  } catch (error) {
    console.error("[GET /api/collections/[id]/events] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}
