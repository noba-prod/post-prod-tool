/**
 * Rolls back an in_progress collection to a previous step.
 * - Only allows going backwards (target step must be less than current).
 * - Deletes collection_events that advanced the workflow past the target step.
 * - Deletes notifications and scheduled_notification_tracking for steps after the target.
 * - Clears collection step fields (URLs, notes) for steps after the target.
 * - Sets substatus to the target step and resets step_statuses / completion_percentage.
 *
 * Steps (1–11): 1=Shooting, 2=Negatives drop off, 3=Low-res scanning, 4=Photographer selection,
 * 5=Client selection, 6=Photographer check, 7=Handprint high-res, 8=Edition request,
 * 9=Final edits, 10=Photographer last check, 11=Client confirmation.
 *
 * Usage:
 *   COLLECTION_ID=<uuid> TARGET_STEP=2 npx tsx scripts/rollback-collection-to-step.ts
 * Or with .env.local (Node 20+):
 *   node --env-file=.env.local --import tsx scripts/rollback-collection-to-step.ts
 */

import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { createAdminClient } from "../lib/supabase/admin"
import type { CollectionSubstatus } from "../lib/domain/collections/types"

// Step number (1–11) → substatus (canonical order from workflow.ts)
const STEP_NUMBER_TO_SUBSTATUS: Record<number, CollectionSubstatus> = {
  1: "shooting",
  2: "negatives_drop_off",
  3: "low_res_scanning",
  4: "photographer_selection",
  5: "client_selection",
  6: "low_res_to_high_res",
  7: "edition_request",
  8: "final_edits",
  9: "photographer_last_check",
  10: "client_confirmation",
  11: "client_confirmation", // step 11 = same as 10 in workflow
}

// Event types that advance the workflow to a given step (step index 1-based).
// We delete these events when rolling back past that step.
const EVENT_TYPES_BY_ADVANCE_TO_STEP: Record<number, string[]> = {
  2: ["shooting_ended", "negatives_pickup_marked"],
  3: ["dropoff_confirmed"],
  4: ["scanning_completed"],
  5: ["photographer_selection_uploaded"],
  6: ["client_selection_confirmed", "photographer_check_approved"],
  7: ["highres_ready"],
  8: ["edition_request_submitted"],
  9: ["final_edits_completed"],
  10: ["photographer_edits_approved"],
  11: ["client_confirmation_confirmed", "collection_completed"],
}

/** Collection fields to clear when rolling back past a given step (step number 3–11). */
const FIELDS_TO_CLEAR_BY_STEP: Record<number, Record<string, unknown>> = {
  3: {
    lowres_selection_url: [],
    lowres_selection_uploaded_at: null,
    step_notes_low_res: [],
  },
  4: {
    photographer_selection_url: [],
    photographer_selection_uploaded_at: null,
    step_notes_photographer_selection: [],
  },
  5: {
    client_selection_url: [],
    client_selection_uploaded_at: null,
    step_notes_client_selection: [],
  },
  6: {
    photographer_review_url: [],
    photographer_review_uploaded_at: null,
    step_notes_photographer_review: [],
  },
  7: {
    highres_selection_url: [],
    highres_selection_uploaded_at: null,
    step_notes_high_res: [],
  },
  8: {
    edition_instructions_url: [],
    edition_instructions_uploaded_at: null,
    step_notes_edition_request: [],
  },
  9: {
    finals_selection_url: [],
    finals_selection_uploaded_at: null,
    step_notes_final_edits: [],
  },
  10: {
    photographer_last_check_url: [],
    photographer_last_check_uploaded_at: null,
    step_notes_photographer_last_check: [],
  },
  11: {
    step_notes_client_confirmation: [],
  },
}

const SUBSTATUS_ORDER: CollectionSubstatus[] = [
  "shooting",
  "negatives_drop_off",
  "low_res_scanning",
  "photographer_selection",
  "client_selection",
  "low_res_to_high_res",
  "edition_request",
  "final_edits",
  "photographer_last_check",
  "client_confirmation",
]

function substatusToIndex(s: string): number {
  const i = SUBSTATUS_ORDER.indexOf(s as CollectionSubstatus)
  return i >= 0 ? i : -1
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) process.env[key] = value
  }
}

async function main() {
  loadEnvLocal()

  const collectionId = process.env.COLLECTION_ID
  const targetStepRaw = process.env.TARGET_STEP

  if (!collectionId) {
    console.error("Missing COLLECTION_ID. Usage: COLLECTION_ID=<uuid> TARGET_STEP=<1-11> npx tsx scripts/rollback-collection-to-step.ts")
    process.exit(1)
  }

  const targetStep = targetStepRaw ? parseInt(targetStepRaw, 10) : NaN
  if (!Number.isInteger(targetStep) || targetStep < 1 || targetStep > 11) {
    console.error("TARGET_STEP must be an integer between 1 and 11.")
    process.exit(1)
  }

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
    .select("id, name, status, substatus")
    .eq("id", collectionId)
    .single()

  if (fetchError || !collection) {
    console.error("Collection not found:", collectionId, fetchError?.message)
    process.exit(1)
  }

  const status = (collection as { status?: string }).status
  if (status !== "in_progress") {
    console.error("Collection is not in_progress. This script only rolls back active (in_progress) collections.")
    process.exit(1)
  }

  const currentSubstatus = (collection as { substatus?: string }).substatus ?? "shooting"
  const currentIndex = substatusToIndex(currentSubstatus)
  const targetSubstatus = STEP_NUMBER_TO_SUBSTATUS[targetStep]
  const targetIndex = SUBSTATUS_ORDER.indexOf(targetSubstatus)

  if (currentIndex < 0) {
    console.error("Unknown current substatus:", currentSubstatus)
    process.exit(1)
  }

  if (targetIndex > currentIndex) {
    console.error(
      `Cannot move forward. Current step is ${currentIndex + 1} (${currentSubstatus}), target is ${targetStep} (${targetSubstatus}). Only rollback to a previous step is allowed.`
    )
    process.exit(1)
  }

  if (targetIndex === currentIndex) {
    console.error(`Collection is already at step ${targetStep}. No change.`)
    process.exit(0)
  }

  // Event types that advanced the workflow to steps after target (to be deleted)
  const eventTypesToDelete: string[] = []
  for (let step = targetStep + 1; step <= 11; step++) {
    const types = EVENT_TYPES_BY_ADVANCE_TO_STEP[step]
    if (types) eventTypesToDelete.push(...types)
  }

  if (eventTypesToDelete.length > 0) {
    const { error: deleteEventsError } = await admin
      .from("collection_events")
      .delete()
      .eq("collection_id", collectionId)
      .in("event_type", eventTypesToDelete)

    if (deleteEventsError) {
      console.error("Failed to delete collection_events:", deleteEventsError)
      process.exit(1)
    }
    console.log("Deleted collection_events for steps after target.")
  }

  // Notifications: delete those whose template step > targetStep
  type NotificationTemplateRow = { id: string }
  const { data: templateIds } = await admin
    .from("notification_templates")
    .select("id")
    .gt("step", targetStep)

  const idsToDelete = ((templateIds ?? []) as NotificationTemplateRow[]).map((t) => t.id)
  if (idsToDelete.length > 0) {
    const { error: deleteNotifError } = await admin
      .from("notifications")
      .delete()
      .eq("collection_id", collectionId)
      .in("template_id", idsToDelete)

    if (deleteNotifError) {
      console.error("Failed to delete notifications:", deleteNotifError)
      process.exit(1)
    }
    console.log("Deleted notifications for steps after target.")
  }

  // scheduled_notification_tracking for steps > targetStep
  if (idsToDelete.length > 0) {
    const { error: deleteTrackingError } = await admin
      .from("scheduled_notification_tracking")
      .delete()
      .eq("collection_id", collectionId)
      .in("template_id", idsToDelete)

    if (deleteTrackingError) {
      console.error("Failed to delete scheduled_notification_tracking:", deleteTrackingError)
      process.exit(1)
    }
    console.log("Deleted scheduled_notification_tracking for steps after target.")
  }

  // Build payload: clear fields for steps > targetStep and set substatus
  const clearPayload: Record<string, unknown> = {
    substatus: targetSubstatus,
    step_statuses: {},
    completion_percentage: 0,
    updated_at: new Date().toISOString(),
  }

  for (let step = targetStep + 1; step <= 11; step++) {
    const fields = FIELDS_TO_CLEAR_BY_STEP[step]
    if (fields) Object.assign(clearPayload, fields)
  }

  const { error: updateError } = await admin
    .from("collections")
    .update(clearPayload as never)
    .eq("id", collectionId)

  if (updateError) {
    console.error("Failed to update collection:", updateError)
    process.exit(1)
  }

  console.log(
    `Done. Collection "${(collection as { name?: string }).name ?? collectionId}" rolled back to step ${targetStep} (${targetSubstatus}).`
  )
}

main()
