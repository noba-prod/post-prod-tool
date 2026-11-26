/**
 * Authorized backfill for All About Basics Drop 2 — shooting_delayed only.
 *
 * Usage (Development validation):
 *   env -i PATH="$PATH" HOME="$HOME" bash -lc 'set -a; source /tmp/noba-dev.env; set +a; \
 *     npx tsx scripts/backfill-shooting-delayed-drop2.ts --dry-run'
 *   ... same without --dry-run to execute on Dev against a fixture or DROP2_ID override.
 *
 * Production (ONLY after explicit authorization):
 *   Use production env + omit --dry-run. Default target is Drop 2 UUID.
 *
 * Safety:
 * - Refuses to run unless SUPABASE URL project ref is allowlisted for the mode.
 * - Checks collection active, shooting unconfirmed, ≥60m past deadline, no prior shooting_delayed.
 * - Creates at most one email + one in_app per noba member via NotificationsService.processTemplate path
 *   (schedule due now + processScheduledNotifications).
 */
import { createClient } from "@supabase/supabase-js"
import { NotificationsService } from "../lib/services/notifications/notifications.service"

const DROP2_ID = process.env.DROP2_ID || "a573da18-56f8-4a00-a981-2da906c115c7"
const DRY_RUN = process.argv.includes("--dry-run")
const ALLOW_PROD = process.argv.includes("--allow-prod")

const DEV_REF = "prneklhdbujxmbuswplp"
const PROD_REF = "kgmbxzpevtwcgolhwuud"

function projectRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i)
    return m?.[1] ?? null
  } catch {
    return null
  }
}

function assertTargetEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  const ref = projectRefFromUrl(url)
  if (!ref) throw new Error(`Cannot parse project ref from URL: ${url}`)
  if (ref === PROD_REF && !ALLOW_PROD) {
    throw new Error(
      `Refusing Production backfill without --allow-prod (url=${url}). Use Dev env or pass --allow-prod after authorization.`
    )
  }
  if (ref !== DEV_REF && ref !== PROD_REF) {
    throw new Error(`Unexpected Supabase project ref: ${ref}`)
  }
  console.log(`Target project ref=${ref} dryRun=${DRY_RUN} collection=${DROP2_ID}`)
  return ref
}

function parseDeadline(dateStr: string | null, timeStr: string | null): Date | null {
  if (!dateStr) return null
  const raw = dateStr.trim()
  const t = (timeStr ?? "").trim().toLowerCase()
  let hh = 17
  let mm = 0
  if (t === "morning") hh = 9
  else if (t.includes("12:00") || t === "midday") hh = 12
  else if (/^\d{1,2}:\d{2}/.test(t)) {
    const [h, m] = t.split(":").map(Number)
    hh = h ?? 17
    mm = m ?? 0
  }
  const d = new Date(`${raw.slice(0, 10)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`)
  return Number.isFinite(d.getTime()) ? d : null
}

async function main() {
  assertTargetEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const service = new NotificationsService(sb as never)

  const { data: col, error } = await sb
    .from("collections")
    .select(
      "id, name, status, substatus, shooting_end_date, shooting_end_time, low_res_to_high_res_digital"
    )
    .eq("id", DROP2_ID)
    .single()
  if (error || !col) throw error ?? new Error("collection not found")

  const c = col as {
    id: string
    name: string
    status: string
    substatus: string | null
    shooting_end_date: string | null
    shooting_end_time: string | null
  }

  const checks: string[] = []
  const fail = (msg: string) => {
    checks.push(`FAIL: ${msg}`)
  }
  const pass = (msg: string) => {
    checks.push(`PASS: ${msg}`)
  }

  if (c.status !== "in_progress") fail(`status=${c.status} (need in_progress)`)
  else pass(`status=in_progress`)

  const { data: confirmEvents } = await sb
    .from("collection_events")
    .select("event_type")
    .eq("collection_id", DROP2_ID)
    .in("event_type", ["shooting_completed_confirmed", "shooting_ended", "negatives_pickup_marked"])
  if ((confirmEvents ?? []).length > 0) fail(`shooting already completed via ${(confirmEvents as { event_type: string }[]).map((e) => e.event_type).join(",")}`)
  else pass("shooting unconfirmed")

  const deadline = parseDeadline(c.shooting_end_date, c.shooting_end_time)
  if (!deadline) fail("cannot parse shooting deadline")
  else if (Date.now() - deadline.getTime() < 60 * 60_000) fail(`deadline+60m not reached (deadline=${deadline.toISOString()})`)
  else pass(`≥60m past deadline (${deadline.toISOString()})`)

  const { data: tpl } = await sb.from("notification_templates").select("id, code").eq("code", "shooting_delayed").single()
  if (!tpl) {
    fail("shooting_delayed template missing — apply migration 098 first")
    console.log(checks.join("\n"))
    process.exit(1)
  }
  const templateId = (tpl as { id: string }).id

  const { data: existingNotifs } = await sb
    .from("notifications")
    .select("id, channel, user_id")
    .eq("collection_id", DROP2_ID)
    .eq("template_id", templateId)
  if ((existingNotifs ?? []).length > 0) fail(`prior shooting_delayed notifications exist (${(existingNotifs ?? []).length})`)
  else pass("no prior shooting_delayed notifications")

  const { data: producers } = await sb
    .from("collection_members")
    .select("user_id")
    .eq("collection_id", DROP2_ID)
    .eq("role", "noba")
  const producerIds = ((producers ?? []) as { user_id: string }[]).map((p) => p.user_id)
  if (producerIds.length === 0) fail("no producer members")
  else pass(`producers=${producerIds.length}`)

  console.log(checks.join("\n"))
  if (checks.some((l) => l.startsWith("FAIL"))) {
    console.error("\nBackfill aborted — conditions not met.")
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log(
      `\nDRY RUN: would insert due scheduled tracking for shooting_delayed and process → expect ${producerIds.length} email + ${producerIds.length} in_app`
    )
    process.exit(0)
  }

  // Insert tracking as already due (do NOT change collection deadline).
  const nowIso = new Date().toISOString()
  const { error: upsertErr } = await sb.from("scheduled_notification_tracking").upsert(
    {
      collection_id: DROP2_ID,
      template_id: templateId,
      scheduled_for: nowIso,
      deadline_value: deadline!.toISOString(),
      is_sent: false,
      is_processing: false,
    } as never,
    { onConflict: "collection_id,template_id,deadline_value" }
  )
  if (upsertErr) throw upsertErr

  const result = await service.processScheduledNotifications({
    timeBudgetMs: 30_000,
    maxScheduled: 20,
    maxDeliveries: 50,
  })

  const { data: created } = await sb
    .from("notifications")
    .select("id, channel, user_id, status")
    .eq("collection_id", DROP2_ID)
    .eq("template_id", templateId)

  const list = (created ?? []) as { channel: string; status: string }[]
  const email = list.filter((n) => n.channel === "email").length
  const inApp = list.filter((n) => n.channel === "in_app").length
  console.log({ result, email, inApp, expected: producerIds.length })
  if (email !== producerIds.length || inApp !== producerIds.length) {
    console.error("Unexpected notification counts")
    process.exit(1)
  }
  console.log("Backfill completed successfully.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
