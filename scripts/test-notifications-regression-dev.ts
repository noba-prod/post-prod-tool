/**
 * Dev-only regression suite for authorized notification changes.
 * HARD GUARD: refuses any project ref other than Dev (prneklhdbujxmbuswplp).
 *
 * Run:
 *   env -i PATH="$PATH" HOME="$HOME" bash -lc 'set -a; source /tmp/noba-dev.env; set +a; \
 *     npx tsx scripts/test-notifications-regression-dev.ts'
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { NotificationsService } from "../lib/services/notifications/notifications.service"
import { isPhotographerSelectionMissedPrerequisiteMet } from "../lib/services/notifications/deadline-missed-guards"

const DEV_REF = "prneklhdbujxmbuswplp"
const PROD_REF = "kgmbxzpevtwcgolhwuud"

type WorkflowKind =
  | "digital_only"
  | "digital_edition"
  | "handprint_only"
  | "handprint_edition"
  | "handprint_diff_lab"
  | "handprint_edition_diff_lab"

function projectRefFromUrl(url: string): string | null {
  try {
    const m = new URL(url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

function assertDevOnly() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const ref = projectRefFromUrl(url)
  if (ref !== DEV_REF) {
    throw new Error(
      `REFUSING TO RUN: expected Dev ref ${DEV_REF}, got ${ref || "unknown"} from ${url}. ` +
        `Local .env may point to Production (${PROD_REF}). Use isolated Dev env.`
    )
  }
  console.log(`✓ Dev project ref confirmed: ${ref}`)
}

const rows: { name: string; pass: boolean; detail?: string }[] = []
function check(name: string, pass: boolean, detail?: string) {
  rows.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? ` | ${detail}` : ""}`)
}

async function cleanup(sb: SupabaseClient, ids: string[]) {
  for (const id of ids) {
    await sb.from("notifications").delete().eq("collection_id", id)
    await sb.from("scheduled_notification_tracking").delete().eq("collection_id", id)
    await sb.from("collection_events").delete().eq("collection_id", id)
    await sb.from("collection_members").delete().eq("collection_id", id)
    await sb.from("collections").delete().eq("id", id)
  }
}

function workflowFlags(kind: WorkflowKind) {
  switch (kind) {
    case "digital_only":
      return { digital: true, handprint: false, edition: false, diffLab: false }
    case "digital_edition":
      return { digital: true, handprint: false, edition: true, diffLab: false }
    case "handprint_only":
      return { digital: false, handprint: true, edition: false, diffLab: false }
    case "handprint_edition":
      return { digital: false, handprint: true, edition: true, diffLab: false }
    case "handprint_diff_lab":
      return { digital: false, handprint: true, edition: false, diffLab: true }
    case "handprint_edition_diff_lab":
      return { digital: false, handprint: true, edition: true, diffLab: true }
  }
}

async function main() {
  assertDevOnly()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const service = new NotificationsService(sb as never)
  const stamp = Date.now()
  const cleanupIds: string[] = []

  const { data: producers } = await sb.from("profiles").select("id, email").eq("is_internal", true).limit(2)
  const producerList = (producers ?? []) as { id: string; email: string }[]
  if (producerList.length < 2) throw new Error("Need ≥2 internal producers")

  const { data: player } = await sb.from("players").select("id").limit(1).single()
  const clientId = (player as { id: string } | null)?.id
  if (!clientId) throw new Error("No players")

  const { data: shootingDelayedTpl } = await sb
    .from("notification_templates")
    .select("*")
    .eq("code", "shooting_delayed")
    .single()
  const sdTpl = shootingDelayedTpl as { id: string } | null

  const { data: csdTpl } = await sb
    .from("notification_templates")
    .select("code, trigger_event")
    .eq("code", "client_selection_delayed")
    .single()
  check(
    "client_selection_delayed trigger is client_selection_deadline_missed",
    (csdTpl as { trigger_event: string } | null)?.trigger_event === "client_selection_deadline_missed",
    JSON.stringify(csdTpl)
  )

  const { data: rem } = await sb
    .from("notification_templates")
    .select("trigger_type, trigger_offset_minutes, trigger_condition")
    .eq("code", "shooting_pickup_reminder_digital")
    .single()
  const remRow = rem as { trigger_type: string; trigger_offset_minutes: number; trigger_condition: string } | null
  check(
    "baseline: shooting_pickup_reminder_digital unchanged",
    !!remRow &&
      remRow.trigger_type === "before" &&
      remRow.trigger_offset_minutes === -30 &&
      remRow.trigger_condition === "is_digital"
  )

  // Pure guard matrix (no DB) — Digital vs Analog isolation
  check(
    "guard Digital needs shooting_completed_confirmed",
    isPhotographerSelectionMissedPrerequisiteMet("digital", ["shooting_completed_confirmed"])
  )
  check(
    "guard Digital rejects scanning_completed-only",
    !isPhotographerSelectionMissedPrerequisiteMet("digital", ["scanning_completed"])
  )
  check(
    "guard Analog needs scanning_completed",
    isPhotographerSelectionMissedPrerequisiteMet("analog", ["scanning_completed"])
  )
  check(
    "guard Analog rejects shooting_completed_confirmed-only",
    !isPhotographerSelectionMissedPrerequisiteMet("analog", ["shooting_completed_confirmed"])
  )

  async function createCollection(
    kind: WorkflowKind,
    opts: {
      name: string
      shootingEnd: Date
      photoDeadline?: Date
      clientDeadline?: Date
      substatus?: string
    }
  ) {
    const f = workflowFlags(kind)
    const end = opts.shootingEnd
    const photo = opts.photoDeadline ?? end
    const client = opts.clientDeadline ?? photo
    const { data, error } = await sb
      .from("collections")
      .insert({
        name: opts.name,
        client_id: clientId,
        status: "in_progress",
        substatus: opts.substatus ?? "shooting",
        low_res_to_high_res_digital: f.digital,
        low_res_to_high_res_hand_print: f.handprint,
        photographer_request_edition: f.edition,
        photographer_collaborates_with_agency: false,
        handprint_different_from_original_lab: f.diffLab,
        shooting_end_date: end.toISOString().slice(0, 10),
        shooting_end_time: end.toISOString().slice(11, 19),
        photo_selection_photographer_preselection_date: photo.toISOString().slice(0, 10),
        photo_selection_photographer_preselection_time: photo.toISOString().slice(11, 19),
        photo_selection_client_selection_date: client.toISOString().slice(0, 10),
        photo_selection_client_selection_time: client.toISOString().slice(11, 19),
        step_statuses: {},
        completion_percentage: 0,
        workflow_revision: 1,
      } as never)
      .select("id")
      .single()
    if (error || !data) throw error ?? new Error("insert failed")
    const id = (data as { id: string }).id
    for (const p of producerList) {
      await sb.from("collection_members").insert({
        collection_id: id,
        user_id: p.id,
        role: "noba",
        can_edit: true,
      } as never)
    }
    cleanupIds.push(id)
    return id
  }

  async function countByCode(collectionId: string, code: string) {
    const { data: tpl } = await sb.from("notification_templates").select("id").eq("code", code).single()
    if (!tpl) return { email: 0, in_app: 0 }
    const { data } = await sb
      .from("notifications")
      .select("channel")
      .eq("collection_id", collectionId)
      .eq("template_id", (tpl as { id: string }).id)
    const list = (data ?? []) as { channel: string }[]
    return {
      email: list.filter((n) => n.channel === "email").length,
      in_app: list.filter((n) => n.channel === "in_app").length,
    }
  }

  try {
    if (!sdTpl) throw new Error("shooting_delayed missing")

    // --- Shooting delayed across all 6 workflows ---
    for (const kind of [
      "digital_only",
      "digital_edition",
      "handprint_only",
      "handprint_edition",
      "handprint_diff_lab",
      "handprint_edition_diff_lab",
    ] as WorkflowKind[]) {
      const shootingEnd = new Date(Date.now() - 90 * 60_000)
      const id = await createCollection(kind, {
        name: `REG SD ${kind} ${stamp}`,
        shootingEnd,
      })
      await sb.from("scheduled_notification_tracking").insert({
        collection_id: id,
        template_id: sdTpl.id,
        scheduled_for: new Date(shootingEnd.getTime() + 60 * 60_000).toISOString(),
        deadline_value: shootingEnd.toISOString(),
        is_sent: false,
      } as never)
      await service.processScheduledNotifications({
        timeBudgetMs: 60_000,
        maxScheduled: 80,
        maxDeliveries: 80,
      })
      const counts = await countByCode(id, "shooting_delayed")
      check(
        `Shooting Delayed fires — ${kind}`,
        counts.email === 2 && counts.in_app === 2,
        `email=${counts.email} in_app=${counts.in_app}`
      )
    }

    // Confirmed → no shooting delayed (digital_only)
    {
      const shootingEnd = new Date(Date.now() - 90 * 60_000)
      const id = await createCollection("digital_only", {
        name: `REG SD confirmed ${stamp}`,
        shootingEnd,
        substatus: "photographer_selection",
      })
      await sb.from("collection_events").insert({
        collection_id: id,
        event_type: "shooting_completed_confirmed",
        notifications_processed: true,
        processed_at: new Date().toISOString(),
      } as never)
      await sb.from("scheduled_notification_tracking").insert({
        collection_id: id,
        template_id: sdTpl.id,
        scheduled_for: new Date(shootingEnd.getTime() + 60 * 60_000).toISOString(),
        deadline_value: shootingEnd.toISOString(),
        is_sent: false,
      } as never)
      await service.processScheduledNotifications({
        timeBudgetMs: 30_000,
        maxScheduled: 50,
        maxDeliveries: 50,
      })
      const counts = await countByCode(id, "shooting_delayed")
      check("Shooting Delayed skipped when confirmed", counts.email === 0 && counts.in_app === 0)
    }

    // Digital photo delayed WITHOUT client delayed
    for (const kind of ["digital_only", "digital_edition"] as WorkflowKind[]) {
      const shootingEnd = new Date(Date.now() - 5 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 3 * 24 * 60_000)
      const id = await createCollection(kind, {
        name: `REG PSD ${kind} ${stamp}`,
        shootingEnd,
        photoDeadline,
        substatus: "photographer_selection",
      })
      await sb.from("collection_events").insert({
        collection_id: id,
        event_type: "shooting_completed_confirmed",
        notifications_processed: true,
        processed_at: new Date().toISOString(),
      } as never)
      await service.detectAndFireMissedDeadlinesForCollection(id)
      const psd = await countByCode(id, "photographer_selection_delayed")
      const csd = await countByCode(id, "client_selection_delayed")
      check(`Photo Selection Delayed — ${kind}`, psd.email === 2 && psd.in_app === 2, `e=${psd.email}`)
      check(`Client Selection Delayed NOT on photo miss — ${kind}`, csd.email === 0 && csd.in_app === 0, `e=${csd.email}`)
    }

    // Client selection delayed only after photo uploaded + own deadline missed
    {
      const shootingEnd = new Date(Date.now() - 10 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 8 * 24 * 60_000)
      const clientDeadline = new Date(Date.now() - 2 * 24 * 60_000)
      const id = await createCollection("digital_only", {
        name: `REG CSD own ${stamp}`,
        shootingEnd,
        photoDeadline,
        clientDeadline,
        substatus: "client_selection",
      })
      await sb.from("collection_events").insert([
        {
          collection_id: id,
          event_type: "shooting_completed_confirmed",
          notifications_processed: true,
          processed_at: new Date().toISOString(),
        },
        {
          collection_id: id,
          event_type: "photographer_selection_uploaded",
          notifications_processed: true,
          processed_at: new Date().toISOString(),
        },
      ] as never)
      await service.detectAndFireMissedDeadlinesForCollection(id)
      const csd = await countByCode(id, "client_selection_delayed")
      const psd = await countByCode(id, "photographer_selection_delayed")
      check("Client Selection Delayed on own missed event", csd.email === 2 && csd.in_app === 2)
      check("Photo Selection Delayed blocked after upload", psd.email === 0 && psd.in_app === 0)
    }

    // Analog photo delayed still requires scanning
    {
      const shootingEnd = new Date(Date.now() - 5 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 3 * 24 * 60_000)
      const id = await createCollection("handprint_only", {
        name: `REG PSD analog ${stamp}`,
        shootingEnd,
        photoDeadline,
        substatus: "photographer_selection",
      })
      await sb.from("collection_events").insert({
        collection_id: id,
        event_type: "scanning_completed",
        notifications_processed: true,
        processed_at: new Date().toISOString(),
      } as never)
      await service.detectAndFireMissedDeadlinesForCollection(id)
      const psd = await countByCode(id, "photographer_selection_delayed")
      const csd = await countByCode(id, "client_selection_delayed")
      check("Analog Photo Selection Delayed with scanning", psd.email === 2 && psd.in_app === 2)
      check("Analog Client Selection Delayed not on photo miss", csd.email === 0 && csd.in_app === 0)
    }

    // Drop2-like backfill dry conditions via script path (fixture)
    {
      const shootingEnd = new Date(Date.now() - 3 * 24 * 60_000)
      const id = await createCollection("digital_only", {
        name: `REG backfill fixture ${stamp}`,
        shootingEnd,
        substatus: "shooting",
      })
      await sb.from("scheduled_notification_tracking").upsert(
        {
          collection_id: id,
          template_id: sdTpl.id,
          scheduled_for: new Date().toISOString(),
          deadline_value: shootingEnd.toISOString(),
          is_sent: false,
        } as never,
        { onConflict: "collection_id,template_id,deadline_value" }
      )
      await service.processScheduledNotifications({
        timeBudgetMs: 30_000,
        maxScheduled: 50,
        maxDeliveries: 50,
      })
      const counts = await countByCode(id, "shooting_delayed")
      check(
        "Backfill-style due tracking → one E+I per producer",
        counts.email === 2 && counts.in_app === 2
      )
      // idempotent: process again
      await service.processScheduledNotifications({
        timeBudgetMs: 30_000,
        maxScheduled: 50,
        maxDeliveries: 50,
      })
      const counts2 = await countByCode(id, "shooting_delayed")
      check("No duplicate shooting_delayed after reprocess", counts2.email === 2 && counts2.in_app === 2)
    }
  } finally {
    await cleanup(sb, cleanupIds)
    console.log(`Cleaned ${cleanupIds.length} test collections`)
  }

  const failed = rows.filter((r) => !r.pass)
  console.log(`\n${rows.length - failed.length}/${rows.length} passed`)
  if (failed.length) {
    console.error(failed)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
