/**
 * POST /api/collections/[id]/reset-steps
 * Resets the collection to the first step: deletes all collection_events and clears
 * step-related fields (steps 1–4) so the process can start from scratch.
 * Uses admin client to bypass RLS for deletion of events.
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: collection, error: fetchError } = await admin
      .from("collections")
      .select("id, status")
      .eq("id", collectionId)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const { error: deleteEventsError } = await admin
      .from("collection_events")
      .delete()
      .eq("collection_id", collectionId)

    if (deleteEventsError) {
      console.error("[reset-steps] Delete events error:", deleteEventsError)
      return NextResponse.json(
        { error: "Failed to delete collection events" },
        { status: 500 }
      )
    }

    // Only set substatus when status is in_progress (DB constraint)
    const substatusField = (collection as { status?: string }).status === "in_progress"
      ? { substatus: "shooting" }
      : { substatus: null }

    const { error: updateError } = await admin
      .from("collections")
      .update({
        ...STEP_FIELDS_TO_RESET,
        ...substatusField,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", collectionId)

    if (updateError) {
      console.error("[reset-steps] Update collection error:", updateError)
      return NextResponse.json(
        { error: "Failed to clear step fields" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Collection reset to first step. All events and step 1–4 data cleared.",
    })
  } catch (error) {
    console.error("[POST /api/collections/[id]/reset-steps] Error:", error)
    return NextResponse.json(
      { error: "Failed to reset collection" },
      { status: 500 }
    )
  }
}
