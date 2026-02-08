/**
 * POST /api/collections/[id]/reset-steps
 * Resets the collection to the first step: deletes all collection_events and clears
 * step-related fields (steps 1–4) so the process can start from scratch.
 * Uses admin client to bypass RLS for deletion of events.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const STEP_FIELDS_TO_NULL = {
  lowres_selection_url: null,
  lowres_lab_notes: null,
  lowres_selection_uploaded_at: null,
  lowres_selection_url02: null,
  lowres_lab_notes02: null,
  lowres_selection_uploaded_at02: null,
  photographer_missingphotos: null,
  photographer_selection_url: null,
  photographer_notes01: null,
  photographer_selection_uploaded_at: null,
  photographer_request_additional_notes: null,
} as const

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
      .select("id")
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

    const { error: updateError } = await admin
      .from("collections")
      .update({
        ...STEP_FIELDS_TO_NULL,
        updated_at: new Date().toISOString(),
      })
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
