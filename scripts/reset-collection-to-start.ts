/**
 * Resets a collection to the first step: deletes all collection_events and clears
 * step-related fields (steps 1–4). Run from project root with env vars set.
 *
 * Usage:
 *   COLLECTION_ID=14cad7ab-b290-4a8a-a01f-b4eba82340a7 npx tsx scripts/reset-collection-to-start.ts
 * Or with .env.local (Node 20+):
 *   node --env-file=.env.local --import tsx scripts/reset-collection-to-start.ts
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { createAdminClient } from "../lib/supabase/admin"

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

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local")
  if (!existsSync(path)) return
  const content = readFileSync(path, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1)
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
    .select("id, name")
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

  const { error: updateError } = await admin
    .from("collections")
    .update({
      ...STEP_FIELDS_TO_NULL,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId)

  if (updateError) {
    console.error("Failed to clear step fields:", updateError)
    process.exit(1)
  }

  console.log(
    `Done. Collection "${(collection as { name?: string }).name ?? collectionId}" reset to first step (events deleted, step 1–4 fields cleared).`
  )
}

main()
