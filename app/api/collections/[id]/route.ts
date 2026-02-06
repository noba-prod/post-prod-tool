/**
 * PATCH /api/collections/[id]
 * Updates collection fields (e.g. lowres_selection_url, lowres_lab_notes).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as {
      lowres_selection_url?: string
      lowres_lab_notes?: string | null
    }
    const { lowres_selection_url, lowres_lab_notes } = body

    const service = createCollectionsServiceForServer()
    const patch: { lowResSelectionUrl?: string; lowResLabNotes?: string | null } = {}
    if (lowres_selection_url !== undefined) patch.lowResSelectionUrl = lowres_selection_url
    if ("lowres_lab_notes" in body) patch.lowResLabNotes = lowres_lab_notes ?? null
    const updated = await service.updateCollection(id, patch)

    if (!updated) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PATCH /api/collections/[id]] Error:", error)
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    )
  }
}
