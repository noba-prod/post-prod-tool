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
import { NotificationsService } from "@/lib/services/notifications/notifications.service"
import { checkInternalUserCollectionMutationScope } from "@/lib/services/collections/internal-scope-guard"
import type { StepNoteEntry } from "@/lib/domain/collections"
import { appendToUrlArray, appendNote, isDuplicateNote, replaceUrlInArray, removeUrlFromArray, updateNotesUrlReference, removeNotesForUrl } from "@/lib/utils/collection-mappers"
import { getStepLinkMutationConfig } from "@/lib/domain/collections/step-link-config"
import type { DropoffAdditionalShipment } from "@/lib/domain/collections"
import { dedupeDropoffAdditionalShipments } from "@/lib/domain/collections/dropoff-shipments"

interface PatchBody {
  // URL appends (single URL string → appended to JSONB array)
  lowres_selection_url?: string
  photographer_selection_url?: string
  client_selection_url?: string
  highres_selection_url?: string
  edition_instructions_url?: string
  finals_selection_url?: string
  photographer_last_check_url?: string
  /** Step 10: URLs from material (finals/high-res) that photographer approved to share with client. Replaces column. */
  photographer_approved_material_urls?: string[]
  // Step note appends (single entry → appended to conversation). url links comment to a specific link.
  step_note_low_res?: { from: string; text: string; url?: string }
  step_note_photographer_selection?: { from: string; text: string; url?: string }
  step_note_client_selection?: { from: string; text: string; url?: string }
  step_note_high_res?: { from: string; text: string; url?: string }
  step_note_edition_request?: { from: string; text: string; url?: string }
  step_note_final_edits?: { from: string; text: string; url?: string }
  step_note_photographer_last_check?: { from: string; text: string; url?: string }
  step_note_client_confirmation?: { from: string; text: string; url?: string }
  /** Replace supplemental drop-off shipments (Analog). Producer-only use case; full array replace. */
  dropoff_additional_shipments?: DropoffAdditionalShipment[]
  /** Primary drop-off shipment (Analog). Updated when producer confirms pickup. */
  dropoff_managing_shipping?: string
  dropoff_shipping_carrier?: string
  dropoff_shipping_tracking?: string
  /** Number of film rolls shipped to the lab in the primary (pickup) shipment. */
  dropoff_rolls_count?: number | null
  /** Edit an existing step link (replaces URL + updates associated notes). */
  step_link_edit?: { step_id: string; old_url: string; new_url: string }
  /** Delete a step link and its associated comments. */
  step_link_delete?: { step_id: string; url: string }
}

const NOTE_KEY_TO_URL_FIELD: Partial<Record<keyof PatchBody, keyof PatchBody>> = {
  step_note_low_res: "lowres_selection_url",
  step_note_photographer_selection: "photographer_selection_url",
  step_note_client_selection: "client_selection_url",
  step_note_high_res: "highres_selection_url",
  step_note_edition_request: "edition_instructions_url",
  step_note_final_edits: "finals_selection_url",
  step_note_photographer_last_check: "photographer_last_check_url",
}

function hasStepUrlInSameRequest(body: PatchBody, noteKey: string): boolean {
  const mappedUrlField = NOTE_KEY_TO_URL_FIELD[noteKey as keyof PatchBody]
  if (!mappedUrlField) return false
  const urlValue = body[mappedUrlField]
  return typeof urlValue === "string" && urlValue.trim().length > 0
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

function sanitizeDropoffAdditionalShipmentsInput(
  raw: unknown
): DropoffAdditionalShipment[] {
  if (!Array.isArray(raw)) return []
  const out: DropoffAdditionalShipment[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const row: DropoffAdditionalShipment = {}
    const m = o.managingShipping
    const p = o.provider
    const t = o.tracking
    if (typeof m === "string" && m.trim()) row.managingShipping = m.trim()
    if (typeof p === "string" && p.trim()) row.provider = p.trim()
    if (typeof t === "string" && t.trim()) row.tracking = t.trim()
    const r = o.rolls
    if (typeof r === "number" && Number.isFinite(r) && r > 0) row.rolls = Math.trunc(r)
    if (Object.keys(row).length > 0) out.push(row)
  }
  return dedupeDropoffAdditionalShipments(out)
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

    const scope = await checkInternalUserCollectionMutationScope(user.id, id)
    if (!scope.canMutate) {
      return NextResponse.json(
        { error: "Forbidden: internal users must be invited to edit this collection." },
        { status: 403 }
      )
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
        photographer_last_check_url,
        photographer_approved_material_urls,
        step_notes_low_res,
        step_notes_photographer_selection,
        step_notes_client_selection,
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
    if (body.photographer_last_check_url !== undefined) {
      const next = appendToUrlArray(
        parseStoredStringArray(raw.photographer_last_check_url),
        body.photographer_last_check_url.trim()
      )
      dbUpdate.photographer_last_check_url = toColumnCompatibleArrayValue(raw.photographer_last_check_url, next)
      dbUpdate.photographer_last_check_uploaded_at = now
    }
    if (body.photographer_approved_material_urls !== undefined) {
      const urls = Array.isArray(body.photographer_approved_material_urls)
        ? body.photographer_approved_material_urls.filter((u) => typeof u === "string" && u.trim().length > 0)
        : []
      dbUpdate.photographer_approved_material_urls = toColumnCompatibleArrayValue(
        (raw as { photographer_approved_material_urls?: unknown }).photographer_approved_material_urls,
        urls
      )
    }

    // --- Step note appends (single entry → appended to conversation array) ---
    const appendedNoteKeys: string[] = []

    const noteFields: Array<{
      bodyKey: keyof PatchBody
      rawKey: string
      patchKey: string
    }> = [
      { bodyKey: "step_note_low_res", rawKey: "step_notes_low_res", patchKey: "stepNotesLowRes" },
      { bodyKey: "step_note_photographer_selection", rawKey: "step_notes_photographer_selection", patchKey: "stepNotesPhotographerSelection" },
      { bodyKey: "step_note_client_selection", rawKey: "step_notes_client_selection", patchKey: "stepNotesClientSelection" },
      { bodyKey: "step_note_high_res", rawKey: "step_notes_high_res", patchKey: "stepNotesHighRes" },
      { bodyKey: "step_note_edition_request", rawKey: "step_notes_edition_request", patchKey: "stepNotesEditionRequest" },
      { bodyKey: "step_note_final_edits", rawKey: "step_notes_final_edits", patchKey: "stepNotesFinalEdits" },
      { bodyKey: "step_note_photographer_last_check", rawKey: "step_notes_photographer_last_check", patchKey: "stepNotesPhotographerLastCheck" },
      { bodyKey: "step_note_client_confirmation", rawKey: "step_notes_client_confirmation", patchKey: "stepNotesClientConfirmation" },
    ]

    for (const { bodyKey, rawKey, patchKey } of noteFields) {
      const noteInput = body[bodyKey] as { from: string; text: string; url?: string } | undefined
      if (noteInput && noteInput.text?.trim()) {
        const entry: StepNoteEntry = {
          from: noteInput.from,
          text: noteInput.text.trim(),
          at: now,
          userId: user.id,
          ...(noteInput.url?.trim() ? { url: noteInput.url.trim() } : {}),
        }
        const existing = parseStoredNotes(raw[rawKey])
        if (isDuplicateNote(existing, entry)) continue
        const next = appendNote(existing, entry)
        const dbKeyByPatchKey: Record<string, string> = {
          stepNotesLowRes: "step_notes_low_res",
          stepNotesPhotographerSelection: "step_notes_photographer_selection",
          stepNotesClientSelection: "step_notes_client_selection",
          stepNotesHighRes: "step_notes_high_res",
          stepNotesEditionRequest: "step_notes_edition_request",
          stepNotesFinalEdits: "step_notes_final_edits",
          stepNotesPhotographerLastCheck: "step_notes_photographer_last_check",
          stepNotesClientConfirmation: "step_notes_client_confirmation",
        }
        const dbKey = dbKeyByPatchKey[patchKey]
        if (dbKey) {
          dbUpdate[dbKey] = toColumnCompatibleNotesValue(raw[rawKey], next)
          appendedNoteKeys.push(bodyKey)
        }
      }
    }

    if (body.dropoff_additional_shipments !== undefined) {
      if (!Array.isArray(body.dropoff_additional_shipments)) {
        return NextResponse.json(
          { error: "dropoff_additional_shipments must be an array" },
          { status: 400 }
        )
      }
      dbUpdate.dropoff_additional_shipments = sanitizeDropoffAdditionalShipmentsInput(
        body.dropoff_additional_shipments
      )
    }

    if (body.dropoff_managing_shipping !== undefined) {
      const v = body.dropoff_managing_shipping.trim()
      if (!v) {
        return NextResponse.json(
          { error: "dropoff_managing_shipping is required" },
          { status: 400 }
        )
      }
      dbUpdate.dropoff_managing_shipping = v
    }
    if (body.dropoff_shipping_carrier !== undefined) {
      const v = body.dropoff_shipping_carrier.trim()
      if (!v) {
        return NextResponse.json(
          { error: "dropoff_shipping_carrier is required" },
          { status: 400 }
        )
      }
      dbUpdate.dropoff_shipping_carrier = v
    }
    if (body.dropoff_shipping_tracking !== undefined) {
      const v = body.dropoff_shipping_tracking.trim()
      if (!v) {
        return NextResponse.json(
          { error: "dropoff_shipping_tracking is required" },
          { status: 400 }
        )
      }
      dbUpdate.dropoff_shipping_tracking = v
    }
    if (body.dropoff_rolls_count !== undefined) {
      const n = body.dropoff_rolls_count
      dbUpdate.dropoff_rolls_count =
        typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
    }

    // --- Step link edit/delete ---
    let linkMutationNotification: { stepNoteKey: string; action: "edited" | "deleted" } | null = null

    const applyStepLinkEdit = (config: ReturnType<typeof getStepLinkMutationConfig>, oldUrl: string, newUrl: string) => {
      if (!config) return false
      const existingUrls = parseStoredStringArray(raw[config.urlDbKey])
      if (!existingUrls.includes(oldUrl)) return false

      const nextUrls = replaceUrlInArray(existingUrls, oldUrl, newUrl)
      dbUpdate[config.urlDbKey] = toColumnCompatibleArrayValue(raw[config.urlDbKey], nextUrls)
      dbUpdate[config.uploadedAtDbKey] = now

      const existingNotes = parseStoredNotes(raw[config.notesDbKey])
      const nextNotes = updateNotesUrlReference(existingNotes, oldUrl, newUrl)
      dbUpdate[config.notesDbKey] = toColumnCompatibleNotesValue(raw[config.notesDbKey], nextNotes)

      if (config.syncHighResOnMutation) {
        const highResExisting = parseStoredStringArray(raw.highres_selection_url)
        if (highResExisting.includes(oldUrl)) {
          const nextHighRes = replaceUrlInArray(highResExisting, oldUrl, newUrl)
          dbUpdate.highres_selection_url = toColumnCompatibleArrayValue(raw.highres_selection_url, nextHighRes)
          dbUpdate.highres_selection_uploaded_at = now
          const highResNotes = parseStoredNotes(raw.step_notes_high_res)
          const nextHighResNotes = updateNotesUrlReference(highResNotes, oldUrl, newUrl)
          dbUpdate.step_notes_high_res = toColumnCompatibleNotesValue(raw.step_notes_high_res, nextHighResNotes)
        }
      }

      const approvedRaw = (raw as { photographer_approved_material_urls?: unknown }).photographer_approved_material_urls
      const approvedExisting = parseStoredStringArray(approvedRaw)
      if (approvedExisting.includes(oldUrl)) {
        const nextApproved = replaceUrlInArray(approvedExisting, oldUrl, newUrl)
        dbUpdate.photographer_approved_material_urls = toColumnCompatibleArrayValue(approvedRaw, nextApproved)
      }

      return true
    }

    const applyStepLinkDelete = (config: ReturnType<typeof getStepLinkMutationConfig>, url: string) => {
      if (!config) return false
      const existingUrls = parseStoredStringArray(raw[config.urlDbKey])
      if (!existingUrls.includes(url)) return false

      const nextUrls = removeUrlFromArray(existingUrls, url)
      dbUpdate[config.urlDbKey] = toColumnCompatibleArrayValue(raw[config.urlDbKey], nextUrls)
      if (nextUrls.length > 0) {
        dbUpdate[config.uploadedAtDbKey] = now
      }

      const existingNotes = parseStoredNotes(raw[config.notesDbKey])
      const nextNotes = removeNotesForUrl(existingNotes, url)
      dbUpdate[config.notesDbKey] = toColumnCompatibleNotesValue(raw[config.notesDbKey], nextNotes)

      if (config.syncHighResOnMutation) {
        const highResExisting = parseStoredStringArray(raw.highres_selection_url)
        if (highResExisting.includes(url)) {
          const nextHighRes = removeUrlFromArray(highResExisting, url)
          dbUpdate.highres_selection_url = toColumnCompatibleArrayValue(raw.highres_selection_url, nextHighRes)
          if (nextHighRes.length > 0) {
            dbUpdate.highres_selection_uploaded_at = now
          }
          const highResNotes = parseStoredNotes(raw.step_notes_high_res)
          const nextHighResNotes = removeNotesForUrl(highResNotes, url)
          dbUpdate.step_notes_high_res = toColumnCompatibleNotesValue(raw.step_notes_high_res, nextHighResNotes)
        }
      }

      const approvedRaw = (raw as { photographer_approved_material_urls?: unknown }).photographer_approved_material_urls
      const approvedExisting = parseStoredStringArray(approvedRaw)
      if (approvedExisting.includes(url)) {
        const nextApproved = removeUrlFromArray(approvedExisting, url)
        dbUpdate.photographer_approved_material_urls = toColumnCompatibleArrayValue(approvedRaw, nextApproved)
      }

      return true
    }

    if (body.step_link_edit) {
      const { step_id, old_url, new_url } = body.step_link_edit
      const oldTrimmed = old_url?.trim()
      const newTrimmed = new_url?.trim()
      if (!step_id?.trim() || !oldTrimmed || !newTrimmed) {
        return NextResponse.json({ error: "step_link_edit requires step_id, old_url, and new_url" }, { status: 400 })
      }
      if (oldTrimmed === newTrimmed) {
        return NextResponse.json({ error: "New URL must be different from the current URL" }, { status: 400 })
      }
      const config = getStepLinkMutationConfig(step_id.trim())
      if (!config) {
        return NextResponse.json({ error: "Unknown step_id for link edit" }, { status: 400 })
      }
      if (!applyStepLinkEdit(config, oldTrimmed, newTrimmed)) {
        return NextResponse.json({ error: "Link not found in step" }, { status: 404 })
      }
      linkMutationNotification = { stepNoteKey: config.stepNoteKey, action: "edited" }
    }

    if (body.step_link_delete) {
      const { step_id, url } = body.step_link_delete
      const urlTrimmed = url?.trim()
      if (!step_id?.trim() || !urlTrimmed) {
        return NextResponse.json({ error: "step_link_delete requires step_id and url" }, { status: 400 })
      }
      const config = getStepLinkMutationConfig(step_id.trim())
      if (!config) {
        return NextResponse.json({ error: "Unknown step_id for link delete" }, { status: 400 })
      }
      if (!applyStepLinkDelete(config, urlTrimmed)) {
        return NextResponse.json({ error: "Link not found in step" }, { status: 404 })
      }
      linkMutationNotification = { stepNoteKey: config.stepNoteKey, action: "deleted" }
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

    // Fire comment notifications for each step note that was appended (non-blocking)
    if (appendedNoteKeys.length > 0) {
      const notifService = new NotificationsService(admin)
      for (const noteKey of appendedNoteKeys) {
        const noteInput = body[noteKey as keyof PatchBody] as { from: string; text: string } | undefined
        // When a step upload submits URL + comment in the same CTA, the main step event
        // already creates the user-facing notification. Skip duplicate "New comment".
        const shouldSkipCommentNotification = hasStepUrlInSameRequest(body, noteKey)
        if (noteInput && !shouldSkipCommentNotification) {
          notifService
            .handleCommentAdded(id, noteKey, user.id, noteInput.text.trim())
            .catch((err) =>
              console.error("[PATCH /api/collections/[id]] Comment notification error:", err)
            )
        }
      }
    }

    // Notify participants when a step link is edited or deleted (non-blocking)
    if (linkMutationNotification) {
      const notifService = new NotificationsService(admin)
      notifService
        .handleLinkChanged(
          id,
          linkMutationNotification.stepNoteKey,
          user.id,
          linkMutationNotification.action
        )
        .catch((err) =>
          console.error("[PATCH /api/collections/[id]] Link change notification error:", err)
        )
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
