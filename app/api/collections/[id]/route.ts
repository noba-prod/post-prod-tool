/**
 * PATCH /api/collections/[id]
 * Updates collection fields.
 * URL fields use append-to-array logic (JSONB arrays).
 * Notes fields use append-to-conversation logic (JSONB arrays).
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"
import type { StepNoteEntry } from "@/lib/domain/collections"
import { appendToUrlArray, appendNote } from "@/lib/utils/collection-mappers"

interface PatchBody {
  // URL appends (single URL string → appended to JSONB array)
  lowres_selection_url?: string
  photographer_selection_url?: string
  client_selection_url?: string
  highres_selection_url?: string
  edition_instructions_url?: string
  finals_selection_url?: string
  // Step note appends (single entry → appended to conversation)
  step_note_low_res?: { from: string; text: string }
  step_note_photographer_selection?: { from: string; text: string }
  step_note_client_selection?: { from: string; text: string }
  step_note_photographer_review?: { from: string; text: string }
  step_note_high_res?: { from: string; text: string }
  step_note_edition_request?: { from: string; text: string }
  step_note_final_edits?: { from: string; text: string }
  step_note_photographer_last_check?: { from: string; text: string }
  step_note_client_confirmation?: { from: string; text: string }
}

function parseStoredStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string")
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return []
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string")
    } catch {
      // legacy plain string
    }
    return [t]
  }
  return []
}

function parseStoredNotes(raw: unknown): StepNoteEntry[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (v): v is StepNoteEntry =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as { from?: unknown }).from === "string" &&
        typeof (v as { text?: unknown }).text === "string" &&
        typeof (v as { at?: unknown }).at === "string"
    )
  }
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return []
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed)) return parseStoredNotes(parsed)
    } catch {
      // legacy plain text note - not structured; ignore
    }
  }
  return []
}

function toColumnCompatibleArrayValue(rawColumnValue: unknown, next: string[]): string[] | string {
  // jsonb column -> keep array; text column -> persist JSON string
  return Array.isArray(rawColumnValue) ? next : JSON.stringify(next)
}

function toColumnCompatibleNotesValue(
  rawColumnValue: unknown,
  next: StepNoteEntry[]
): StepNoteEntry[] | string {
  // jsonb column -> keep array; text column -> persist JSON string
  return Array.isArray(rawColumnValue) ? next : JSON.stringify(next)
}

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

    const body = (await request.json()) as PatchBody

    // Fetch current collection (domain) to map back response
    const service = createCollectionsServiceForServer()
    const current = await service.getCollectionById(id)
    if (!current) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    // Fetch raw DB values so we can support both jsonb and legacy text storage
    const { data: rawRow } = await supabase
      .from("collections")
      .select(`
        lowres_selection_url,
        photographer_selection_url,
        client_selection_url,
        highres_selection_url,
        edition_instructions_url,
        finals_selection_url,
        step_notes_low_res,
        step_notes_photographer_selection,
        step_notes_client_selection,
        step_notes_photographer_review,
        step_notes_high_res,
        step_notes_edition_request,
        step_notes_final_edits,
        step_notes_photographer_last_check,
        step_notes_client_confirmation
      `)
      .eq("id", id)
      .single()
    const raw = (rawRow ?? {}) as Record<string, unknown>

    const now = new Date().toISOString()
    const dbUpdate: Record<string, unknown> = {}

    // --- URL appends (each single string → appended to existing JSONB array) ---
    if (body.lowres_selection_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.lowres_selection_url),
        body.lowres_selection_url.trim()
      )
      dbUpdate.lowres_selection_url = toColumnCompatibleArrayValue(raw.lowres_selection_url, next)
      dbUpdate.lowres_selection_uploaded_at = now
    }
    if (body.photographer_selection_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.photographer_selection_url),
        body.photographer_selection_url.trim()
      )
      dbUpdate.photographer_selection_url = toColumnCompatibleArrayValue(
        raw.photographer_selection_url,
        next
      )
      dbUpdate.photographer_selection_uploaded_at = now
    }
    if (body.client_selection_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.client_selection_url),
        body.client_selection_url.trim()
      )
      dbUpdate.client_selection_url = toColumnCompatibleArrayValue(raw.client_selection_url, next)
      dbUpdate.client_selection_uploaded_at = now
    }
    if (body.highres_selection_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.highres_selection_url),
        body.highres_selection_url.trim()
      )
      dbUpdate.highres_selection_url = toColumnCompatibleArrayValue(raw.highres_selection_url, next)
      dbUpdate.highres_selection_uploaded_at = now
    }
    if (body.edition_instructions_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.edition_instructions_url),
        body.edition_instructions_url.trim()
      )
      dbUpdate.edition_instructions_url = toColumnCompatibleArrayValue(
        raw.edition_instructions_url,
        next
      )
      dbUpdate.edition_instructions_uploaded_at = now
    }
    if (body.finals_selection_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.finals_selection_url),
        body.finals_selection_url.trim()
      )
      dbUpdate.finals_selection_url = toColumnCompatibleArrayValue(raw.finals_selection_url, next)
      dbUpdate.finals_selection_uploaded_at = now
    }

    // --- Step note appends (single entry → appended to conversation array) ---
    const noteFields: Array<{
      bodyKey: keyof PatchBody
      rawKey: string
      patchKey: string
    }> = [
      { bodyKey: "step_note_low_res", rawKey: "step_notes_low_res", patchKey: "stepNotesLowRes" },
      { bodyKey: "step_note_photographer_selection", rawKey: "step_notes_photographer_selection", patchKey: "stepNotesPhotographerSelection" },
      { bodyKey: "step_note_client_selection", rawKey: "step_notes_client_selection", patchKey: "stepNotesClientSelection" },
      { bodyKey: "step_note_photographer_review", rawKey: "step_notes_photographer_review", patchKey: "stepNotesPhotographerReview" },
      { bodyKey: "step_note_high_res", rawKey: "step_notes_high_res", patchKey: "stepNotesHighRes" },
      { bodyKey: "step_note_edition_request", rawKey: "step_notes_edition_request", patchKey: "stepNotesEditionRequest" },
      { bodyKey: "step_note_final_edits", rawKey: "step_notes_final_edits", patchKey: "stepNotesFinalEdits" },
      { bodyKey: "step_note_photographer_last_check", rawKey: "step_notes_photographer_last_check", patchKey: "stepNotesPhotographerLastCheck" },
      { bodyKey: "step_note_client_confirmation", rawKey: "step_notes_client_confirmation", patchKey: "stepNotesClientConfirmation" },
    ]

    for (const { bodyKey, rawKey, patchKey } of noteFields) {
      const noteInput = body[bodyKey] as { from: string; text: string } | undefined
      if (noteInput && noteInput.text?.trim()) {
        const entry: StepNoteEntry = {
          from: noteInput.from,
          text: noteInput.text.trim(),
          at: now,
        }
        const existing = parseStoredNotes(raw[rawKey])
        const next = appendNote(existing, entry)
        const dbKeyByPatchKey: Record<string, string> = {
          stepNotesLowRes: "step_notes_low_res",
          stepNotesPhotographerSelection: "step_notes_photographer_selection",
          stepNotesClientSelection: "step_notes_client_selection",
          stepNotesPhotographerReview: "step_notes_photographer_review",
          stepNotesHighRes: "step_notes_high_res",
          stepNotesEditionRequest: "step_notes_edition_request",
          stepNotesFinalEdits: "step_notes_final_edits",
          stepNotesPhotographerLastCheck: "step_notes_photographer_last_check",
          stepNotesClientConfirmation: "step_notes_client_confirmation",
        }
        const dbKey = dbKeyByPatchKey[patchKey]
        if (dbKey) {
          dbUpdate[dbKey] = toColumnCompatibleNotesValue(raw[rawKey], next)
        }
      }
    }

    if (Object.keys(dbUpdate).length === 0) {
      return NextResponse.json({ success: true, collection: current })
    }

    // Write directly with admin client to avoid silent repository fallback masking DB errors.
    // Access is still checked via authenticated user + RLS-protected read above.
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from("collections")
      .update({
        ...dbUpdate,
        updated_at: now,
      } as never)
      .eq("id", id)

    if (updateError) {
      console.error("[PATCH /api/collections/[id]] Direct DB update error:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to update collection fields" },
        { status: 500 }
      )
    }

    const updated = await service.getCollectionById(id)
    if (!updated) {
      return NextResponse.json({ error: "Collection not found after update" }, { status: 404 })
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
