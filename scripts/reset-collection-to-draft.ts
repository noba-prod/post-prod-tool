/**
 * Resets a collection to draft mode for internal testing.
 * - Deletes all collection_events for the collection
 * - Deletes scheduled_notification_tracking rows
 * - Resets workflow/progress fields and sets status back to draft
 *
 * Usage:
 *   COLLECTION_ID=14cad7ab-b290-4a8a-a01f-b4eba82340a7 npx tsx scripts/reset-collection-to-draft.ts
 * Or with .env.local (Node 20+):
 *   node --env-file=.env.local --import tsx scripts/reset-collection-to-draft.ts
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { createAdminClient } from "../lib/supabase/admin"

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
      `[reset-collection-to-draft] Skipping missing column "${missingColumn}" and retrying.`
    )
  }

  throw new Error("Failed to reset collection after column-fallback retries")
}

function loadEnvLocal() {
  const path = resolve(
    process.cwd(),
    existsSync(resolve(process.cwd(), ".env.local")) ? ".env.local" : ".env"
  )
  if (!existsSync(path)) return
  const content = readFileSync(path, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()

  const collectionId =
    process.env.COLLECTION_ID ?? "14cad7ab-b290-4a8a-a01f-b4eba82340a7"

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. from .env.local)."
    )
    process.exit(1)
  }

  const admin = createAdminClient()

  const { data: collection, error: fetchError } = await admin
    .from("collections")
    .select("id, name, status")
    .eq("id", collectionId)
    .single()

  if (fetchError || !collection) {
    console.error("Collection not found:", collectionId, fetchError?.message)
    process.exit(1)
  }

  const { error: deleteEventsError } = await admin
    .from("collection_events")
    .delete()
    .eq("collection_id", collectionId)

  if (deleteEventsError) {
    console.error("Failed to delete collection_events:", deleteEventsError)
    process.exit(1)
  }

  const { error: deleteTrackingError } = await admin
    .from("scheduled_notification_tracking")
    .delete()
    .eq("collection_id", collectionId)

  if (deleteTrackingError) {
    console.error("Failed to delete scheduled_notification_tracking:", deleteTrackingError)
    process.exit(1)
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
    console.error("Failed to reset collection to draft:", updateError)
    process.exit(1)
  }

  console.log(
    `Done. Collection "${(collection as { name?: string }).name ?? collectionId}" reset to draft mode.`
  )
}

main()
