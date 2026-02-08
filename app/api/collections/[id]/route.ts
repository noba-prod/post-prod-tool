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
      lowres_selection_url02?: string
      lowres_lab_notes02?: string | null
      photographer_selection_url?: string
      photographer_notes01?: string | null
      photographer_request_additional_notes?: string | null
      photographer_missingphotos?: string | null
    }
    const {
      lowres_selection_url,
      lowres_lab_notes,
      lowres_selection_url02,
      lowres_lab_notes02,
      photographer_selection_url,
      photographer_notes01,
      photographer_request_additional_notes,
      photographer_missingphotos,
    } = body

    const service = createCollectionsServiceForServer()
    const patch: {
      lowResSelectionUrl?: string
      lowResSelectionUploadedAt?: string
      lowResLabNotes?: string | null
      lowResSelectionUrl02?: string
      lowResSelectionUploadedAt02?: string
      lowResLabNotes02?: string | null
      photographerSelectionUrl?: string
      photographerSelectionUploadedAt?: string
      photographerNotes01?: string | null
      photographerRequestAdditionalNotes?: string | null
      photographerMissingphotos?: string | null
    } = {}
    if (lowres_selection_url !== undefined) {
      patch.lowResSelectionUrl = lowres_selection_url
      patch.lowResSelectionUploadedAt = new Date().toISOString()
    }
    if ("lowres_lab_notes" in body) patch.lowResLabNotes = lowres_lab_notes ?? null
    if (lowres_selection_url02 !== undefined) {
      patch.lowResSelectionUrl02 = lowres_selection_url02
      patch.lowResSelectionUploadedAt02 = new Date().toISOString()
    }
    if ("lowres_lab_notes02" in body) patch.lowResLabNotes02 = lowres_lab_notes02 ?? null
    if (photographer_selection_url !== undefined) {
      patch.photographerSelectionUrl = photographer_selection_url
      patch.photographerSelectionUploadedAt = new Date().toISOString()
    }
    if ("photographer_notes01" in body) patch.photographerNotes01 = photographer_notes01 ?? null
    if ("photographer_request_additional_notes" in body) patch.photographerRequestAdditionalNotes = photographer_request_additional_notes ?? null
    if ("photographer_missingphotos" in body) patch.photographerMissingphotos = photographer_missingphotos ?? null
    const updated = await service.updateCollection(id, patch)

    if (!updated) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, collection: updated })
  } catch (error) {
    console.error("[PATCH /api/collections/[id]] Error:", error)
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    )
  }
}
