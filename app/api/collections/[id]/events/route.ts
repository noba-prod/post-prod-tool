/**
 * POST /api/collections/[id]/events
 * Triggers a collection event, updates collection substatus when applicable, and processes notifications.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { NotificationsService, type CollectionEventType } from "@/lib/services/notifications"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"
import { CollectionsServiceError } from "@/lib/services/collections"
import { getSubstatusAdvanceForEvent } from "@/lib/services/collections/event-substatus-mapping"

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
  "photographer_requested_additional_photos",
  "photographer_request_missing_photos",
  "client_request_missing_photos",
  "client_selection_started",
  "client_selection_confirmed",
  "client_selection_deadline_missed",
  "photographer_check_approved",
  "photographer_check_deadline_missed",
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
  "client_confirmation_confirmed",
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

    // Trigger the event (records in collection_events and sends notifications)
    const notificationsService = new NotificationsService(supabase)
    await notificationsService.triggerEvent(
      collectionId,
      eventType as CollectionEventType,
      user.id,
      metadata
    )

    // Update collection substatus (or status for complete/cancel/revert) per linear workflow.
    // For photographer_requested_additional_photos we support multiple revert targets
    // driven by metadata.source:
    // - client -> photographer_selection
    // - photographer_review -> client_selection
    // - high_res -> photographer_review (substatus client_selection)
    // - photographer_last_check -> final_edits
    // - default -> low_res_scanning
    let advance = getSubstatusAdvanceForEvent(eventType as CollectionEventType)
    if (eventType === "photographer_requested_additional_photos") {
      const source = String((metadata as { source?: string } | undefined)?.source ?? "").trim()
      if (source === "client") {
        advance = { action: "revert", substatus: "photographer_selection" }
      } else if (source === "photographer_review") {
        advance = { action: "revert", substatus: "client_selection" }
      } else if (source === "high_res") {
        advance = { action: "revert", substatus: "client_selection" }
      } else if (source === "photographer_last_check") {
        advance = { action: "revert", substatus: "final_edits" }
      } else if (source === "client_confirmation") {
        advance = { action: "revert", substatus: "photographer_last_check" }
      }
    }
    if (advance.action !== "none") {
      try {
        const collectionsService = createCollectionsServiceForServer()
        if (advance.action === "advance") {
          await collectionsService.updateSubstatus(collectionId, advance.substatus)
        } else if (advance.action === "revert") {
          // Revert: force-set substatus backwards (e.g. missing photos)
          await collectionsService.revertSubstatus(collectionId, advance.substatus)
        } else if (advance.action === "complete") {
          await collectionsService.completeCollection(collectionId)
        } else if (advance.action === "cancel") {
          await collectionsService.cancelCollection(collectionId)
        }
      } catch (err) {
        if (err instanceof CollectionsServiceError) {
          if (err.code === "INVALID_TRANSITION") {
            // Substatus out of sync — event was recorded; log and continue gracefully
            console.warn("[POST /api/collections/[id]/events] Substatus transition skipped (out of sync):", err.message)
          } else if (err.code === "INVALID_STATUS") {
            // Collection status is not in_progress (often due to stale UI state). Event was recorded.
            // Keep the event successful and let canonical status sync resolve on next collection fetch.
            console.warn("[POST /api/collections/[id]/events] Substatus transition skipped (invalid status):", err.message)
          } else if (err.code === "NOT_FOUND") {
            return NextResponse.json({ error: "Collection not found" }, { status: 404 })
          } else {
            console.error("[POST /api/collections/[id]/events] Substatus update failed:", err)
          }
        } else {
          console.error("[POST /api/collections/[id]/events] Substatus update failed:", err)
        }
      }
    }

    // Recompute step_statuses and completion_percentage from all events
    try {
      const { data: allEvents } = await supabase
        .from("collection_events")
        .select("event_type, created_at, metadata")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: true })

      if (allEvents && allEvents.length > 0) {
        const collectionsService = createCollectionsServiceForServer()
        await collectionsService.recomputeAndPersistProgress(
          collectionId,
          allEvents as Array<{ event_type: string; created_at: string; metadata?: Record<string, unknown> | null }>,
          new Date(),
          eventType
        )
      }
    } catch (err) {
      // Best-effort: don't fail the event if progress recomputation fails
      console.error("[POST /api/collections/[id]/events] Progress recomputation failed:", err)
    }

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
