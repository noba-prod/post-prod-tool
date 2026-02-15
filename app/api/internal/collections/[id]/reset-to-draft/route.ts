/**
 * POST /api/internal/collections/[id]/reset-to-draft
 * Internal/testing helper:
 * - resets collection status to draft
 * - clears published/substatus/progress fields
 * - removes workflow events and scheduled notifications
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const STEP_FIELDS_TO_RESET: Record<string, unknown> = {
  // URL arrays (JSONB — migration 034)
  lowres_selection_url: [],
  lowres_selection_uploaded_at: null,
  photographer_selection_url: [],
  photographer_selection_uploaded_at: null,
  client_selection_url: [],
  client_selection_uploaded_at: null,
  highres_selection_url: [],
  highres_selection_uploaded_at: null,
  edition_instructions_url: [],
  edition_instructions_uploaded_at: null,
  finals_selection_url: [],
  finals_selection_uploaded_at: null,
  // Step notes conversations
  step_notes_low_res: [],
  step_notes_photographer_selection: [],
  step_notes_client_selection: [],
  step_notes_photographer_review: [],
  step_notes_high_res: [],
  step_notes_edition_request: [],
  step_notes_final_edits: [],
  step_notes_photographer_last_check: [],
  step_notes_client_confirmation: [],
  // Progress tracking
  step_statuses: {},
  completion_percentage: 0,
}

function extractMissingColumnFromErrorMessage(message: string | undefined): string | null {
  if (!message) return null
  const match = message.match(/Could not find the '([^']+)' column/)
  return match?.[1] ?? null
}

async function updateCollectionsWithColumnFallback(
  admin: ReturnType<typeof createAdminClient>,
  collectionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const nextPayload: Record<string, unknown> = { ...payload }

  // Retry by removing unknown columns to support environments with older schema caches.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { error } = await admin
      .from("collections")
      .update(nextPayload as never)
      .eq("id", collectionId)

    if (!error) return

    const missingColumn = extractMissingColumnFromErrorMessage(
      (error as { message?: string }).message
    )
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw error
    }

    delete nextPayload[missingColumn]
    console.warn(
      `[reset-to-draft] Skipping missing column "${missingColumn}" and retrying.`
    )
  }

  throw new Error("Failed to reset collection after column-fallback retries")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const requiredKey = process.env.INTERNAL_RESET_COLLECTION_KEY?.trim()
    if (requiredKey) {
      const providedKey = request.headers.get("x-internal-key")?.trim()
      if (providedKey !== requiredKey) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: collection, error: collectionError } = await admin
      .from("collections")
      .select("id, name")
      .eq("id", collectionId)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const { error: deleteEventsError } = await admin
      .from("collection_events")
      .delete()
      .eq("collection_id", collectionId)

    if (deleteEventsError) {
      console.error("[reset-to-draft] Delete events error:", deleteEventsError)
      return NextResponse.json(
        { error: "Failed to delete collection events" },
        { status: 500 }
      )
    }

    const { error: deleteTrackingError } = await admin
      .from("scheduled_notification_tracking")
      .delete()
      .eq("collection_id", collectionId)

    if (deleteTrackingError) {
      console.error("[reset-to-draft] Delete scheduled tracking error:", deleteTrackingError)
      return NextResponse.json(
        { error: "Failed to delete scheduled notifications" },
        { status: 500 }
      )
    }

    try {
      await updateCollectionsWithColumnFallback(admin, collectionId, {
        status: "draft",
        published_at: null,
        substatus: null,
        ...STEP_FIELDS_TO_RESET,
        updated_at: new Date().toISOString(),
      })
    } catch (updateError) {
      console.error("[reset-to-draft] Update collection error:", updateError)
      return NextResponse.json(
        { error: "Failed to reset collection to draft" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Collection "${(collection as { name?: string }).name ?? collectionId}" reset to draft mode.`,
      collectionId,
    })
  } catch (error) {
    console.error("[POST /api/internal/collections/[id]/reset-to-draft] Error:", error)
    return NextResponse.json(
      { error: "Failed to reset collection to draft" },
      { status: 500 }
    )
  }
}
