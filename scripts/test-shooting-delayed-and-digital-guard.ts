/**
 * Dev integration checks: shooting_delayed + Digital photo-selection missed guard.
 * Run: npx tsx --env-file=.env scripts/test-shooting-delayed-and-digital-guard.ts
 */
import { createClient } from "@supabase/supabase-js"
import { NotificationsService } from "../lib/services/notifications/notifications.service"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE_ROLE_KEY")
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const service = new NotificationsService(sb as never)

type Row = { pass: boolean; name: string; detail?: string }
const rows: Row[] = []
function check(name: string, pass: boolean, detail?: string) {
  rows.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? ` | ${detail}` : ""}`)
}

async function cleanup(ids: string[]) {
  for (const id of ids) {
    await sb.from("notifications").delete().eq("collection_id", id)
    await sb.from("scheduled_notification_tracking").delete().eq("collection_id", id)
    await sb.from("collection_events").delete().eq("collection_id", id)
    await sb.from("collection_members").delete().eq("collection_id", id)
    await sb.from("collections").delete().eq("id", id)
  }
}

async function createCollection(opts: {
  name: string
  digital: boolean
  shootingEnd: Date
  photoDeadline?: Date
  substatus?: string
}) {
  const end = opts.shootingEnd
  const photo = opts.photoDeadline ?? end
  const { data: player } = await sb.from("players").select("id").limit(1).single()
  const clientId = (player as { id: string } | null)?.id
  if (!clientId) throw new Error("No players row available for client_id")

  const { data, error } = await sb
    .from("collections")
    .insert({
      name: opts.name,
      client_id: clientId,
      status: "in_progress",
      substatus: opts.substatus ?? "shooting",
      low_res_to_high_res_digital: opts.digital,
      low_res_to_high_res_hand_print: !opts.digital,
      photographer_request_edition: false,
      photographer_collaborates_with_agency: false,
      handprint_different_from_original_lab: false,
      shooting_end_date: end.toISOString().slice(0, 10),
      shooting_end_time: end.toISOString().slice(11, 19),
      photo_selection_photographer_preselection_date: photo.toISOString().slice(0, 10),
      photo_selection_photographer_preselection_time: photo.toISOString().slice(11, 19),
      step_statuses: {},
      completion_percentage: 0,
      workflow_revision: 1,
    } as never)
    .select("id")
    .single()
  if (error || !data) throw error ?? new Error("insert collection failed")
  return (data as { id: string }).id
}

async function addProducers(collectionId: string, producerIds: string[]) {
  for (const userId of producerIds) {
    const { error } = await sb.from("collection_members").insert({
      collection_id: collectionId,
      user_id: userId,
      role: "noba",
      can_edit: true,
    } as never)
    if (error) throw error
  }
}

async function countNotifs(collectionId: string, code: string) {
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

async function main() {
  const stamp = Date.now()
  const cleanupIds: string[] = []

  const { data: producers } = await sb
    .from("profiles")
    .select("id, email")
    .eq("is_internal", true)
    .limit(2)
  const producerList = (producers ?? []) as { id: string; email: string }[]
  if (producerList.length < 2) {
    console.error("Need ≥2 internal producers in Dev")
    process.exit(1)
  }

  const { data: delayedTpl } = await sb
    .from("notification_templates")
    .select("*")
    .eq("code", "shooting_delayed")
    .single()
  const tpl = delayedTpl as {
    id: string
    trigger_type: string
    trigger_offset_minutes: number
    email_recipients: string[]
    inapp_recipients: string[]
  } | null
  check(
    "DB template shooting_delayed",
    !!tpl &&
      tpl.trigger_type === "after" &&
      tpl.trigger_offset_minutes === 60 &&
      tpl.email_recipients.includes("producer") &&
      tpl.inapp_recipients.includes("producer")
  )
  if (!tpl) {
    process.exit(1)
  }

  try {
    // 1) Unconfirmed, 90m past deadline → process delayed → expect E+I per producer
    {
      const shootingEnd = new Date(Date.now() - 90 * 60_000)
      const id = await createCollection({
        name: `TEST SD due ${stamp}`,
        digital: true,
        shootingEnd,
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      await sb.from("scheduled_notification_tracking").insert({
        collection_id: id,
        template_id: tpl.id,
        scheduled_for: new Date(shootingEnd.getTime() + 60 * 60_000).toISOString(),
        deadline_value: shootingEnd.toISOString(),
        is_sent: false,
      } as never)

      const r = await service.processScheduledNotifications({
        timeBudgetMs: 30_000,
        maxScheduled: 50,
        maxDeliveries: 50,
      })
      const counts = await countNotifs(id, "shooting_delayed")
      check(
        "Digital unconfirmed +90m → shooting_delayed E+I for 2 producers",
        counts.email === 2 && counts.in_app === 2,
        `email=${counts.email} in_app=${counts.in_app} cron=${JSON.stringify(r)}`
      )
    }

    // 2) Confirmed before delayed fires → milestone skip → 0 notifs
    {
      const shootingEnd = new Date(Date.now() - 90 * 60_000)
      const id = await createCollection({
        name: `TEST SD confirmed ${stamp}`,
        digital: true,
        shootingEnd,
        substatus: "photographer_selection",
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      await sb.from("collection_events").insert({
        collection_id: id,
        event_type: "shooting_completed_confirmed",
        notifications_processed: true,
        processed_at: new Date().toISOString(),
      } as never)
      await sb.from("scheduled_notification_tracking").insert({
        collection_id: id,
        template_id: tpl.id,
        scheduled_for: new Date(shootingEnd.getTime() + 60 * 60_000).toISOString(),
        deadline_value: shootingEnd.toISOString(),
        is_sent: false,
      } as never)
      await service.processScheduledNotifications({
        timeBudgetMs: 30_000,
        maxScheduled: 50,
        maxDeliveries: 50,
      })
      const counts = await countNotifs(id, "shooting_delayed")
      check(
        "Confirmed shooting → no shooting_delayed",
        counts.email === 0 && counts.in_app === 0,
        `email=${counts.email} in_app=${counts.in_app}`
      )
    }

    // 3) Only 30m past deadline (before +60) — tracking not due yet if scheduled_for in future
    {
      const shootingEnd = new Date(Date.now() - 30 * 60_000)
      const id = await createCollection({
        name: `TEST SD early ${stamp}`,
        digital: true,
        shootingEnd,
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      const scheduledFor = new Date(shootingEnd.getTime() + 60 * 60_000) // still ~30m in future
      await sb.from("scheduled_notification_tracking").insert({
        collection_id: id,
        template_id: tpl.id,
        scheduled_for: scheduledFor.toISOString(),
        deadline_value: shootingEnd.toISOString(),
        is_sent: false,
      } as never)
      await service.processScheduledNotifications({
        timeBudgetMs: 30_000,
        maxScheduled: 50,
        maxDeliveries: 50,
      })
      const counts = await countNotifs(id, "shooting_delayed")
      check(
        "+30m after deadline → delayed not yet due",
        counts.email === 0 && counts.in_app === 0,
        `email=${counts.email} scheduled_for=${scheduledFor.toISOString()}`
      )
    }

    // 4) Digital guard: shooting confirmed + photo deadline missed → fires delayed photo selection
    {
      const shootingEnd = new Date(Date.now() - 3 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 2 * 24 * 60_000)
      const id = await createCollection({
        name: `TEST PSD digital ${stamp}`,
        digital: true,
        shootingEnd,
        photoDeadline,
        substatus: "photographer_selection",
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      await sb.from("collection_events").insert({
        collection_id: id,
        event_type: "shooting_completed_confirmed",
        notifications_processed: true,
        processed_at: new Date().toISOString(),
      } as never)

      const before = await sb
        .from("collection_events")
        .select("id")
        .eq("collection_id", id)
        .eq("event_type", "photographer_selection_deadline_missed")
      check("precondition: no photo missed event yet", (before.data ?? []).length === 0)

      const fired = await service.detectAndFireMissedDeadlinesForCollection(id)
      const after = await sb
        .from("collection_events")
        .select("id")
        .eq("collection_id", id)
        .eq("event_type", "photographer_selection_deadline_missed")
      check(
        "Digital + shooting confirmed + overdue photo sel → missed event fires",
        fired.fired >= 1 && (after.data ?? []).length === 1,
        `fired=${fired.fired} events=${(after.data ?? []).length}`
      )

      const psd = await countNotifs(id, "photographer_selection_delayed")
      const csd = await countNotifs(id, "client_selection_delayed")
      check(
        "photographer_selection_delayed created for producers",
        psd.email === 2 && psd.in_app === 2,
        `email=${psd.email} in_app=${psd.in_app}`
      )
      check(
        "NOTE: client_selection_delayed also fires on same trigger (mig 053)",
        csd.email === 2 && csd.in_app === 2,
        `email=${csd.email} in_app=${csd.in_app} — dual alert; not changed`
      )
    }

    // 5) Digital without shooting confirm → must NOT fire photo selection missed
    {
      const shootingEnd = new Date(Date.now() - 3 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 2 * 24 * 60_000)
      const id = await createCollection({
        name: `TEST PSD no confirm ${stamp}`,
        digital: true,
        shootingEnd,
        photoDeadline,
        substatus: "shooting",
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      const fired = await service.detectAndFireMissedDeadlinesForCollection(id)
      const after = await sb
        .from("collection_events")
        .select("id")
        .eq("collection_id", id)
        .eq("event_type", "photographer_selection_deadline_missed")
      check(
        "Digital without shooting_completed_confirmed → no photo missed",
        fired.fired === 0 && (after.data ?? []).length === 0,
        `fired=${fired.fired}`
      )
    }

    // 6) Analog without scanning_completed → still blocked (regression)
    {
      const shootingEnd = new Date(Date.now() - 3 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 2 * 24 * 60_000)
      const id = await createCollection({
        name: `TEST PSD analog ${stamp}`,
        digital: false,
        shootingEnd,
        photoDeadline,
        substatus: "photographer_selection",
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      // Analog path to photo selection normally has scanning_completed; omit it on purpose
      await sb.from("collection_events").insert({
        collection_id: id,
        event_type: "shooting_ended",
        notifications_processed: true,
        processed_at: new Date().toISOString(),
      } as never)
      const fired = await service.detectAndFireMissedDeadlinesForCollection(id)
      const after = await sb
        .from("collection_events")
        .select("id")
        .eq("collection_id", id)
        .eq("event_type", "photographer_selection_deadline_missed")
      check(
        "Analog without scanning_completed → still blocked",
        (after.data ?? []).length === 0,
        `fired=${fired.fired}`
      )
    }

    // 7) Analog WITH scanning_completed → fires (regression preserve)
    {
      const shootingEnd = new Date(Date.now() - 3 * 24 * 60_000)
      const photoDeadline = new Date(Date.now() - 2 * 24 * 60_000)
      const id = await createCollection({
        name: `TEST PSD analog ok ${stamp}`,
        digital: false,
        shootingEnd,
        photoDeadline,
        substatus: "photographer_selection",
      })
      cleanupIds.push(id)
      await addProducers(
        id,
        producerList.map((p) => p.id)
      )
      await sb.from("collection_events").insert([
        {
          collection_id: id,
          event_type: "dropoff_confirmed",
          notifications_processed: true,
          processed_at: new Date().toISOString(),
        },
        {
          collection_id: id,
          event_type: "scanning_completed",
          notifications_processed: true,
          processed_at: new Date().toISOString(),
        },
      ] as never)
      const fired = await service.detectAndFireMissedDeadlinesForCollection(id)
      const after = await sb
        .from("collection_events")
        .select("id")
        .eq("collection_id", id)
        .eq("event_type", "photographer_selection_deadline_missed")
      check(
        "Analog with scanning_completed → missed fires",
        fired.fired >= 1 && (after.data ?? []).length === 1,
        `fired=${fired.fired}`
      )
    }

    // 8) Reminder template unchanged
    {
      const { data: rem } = await sb
        .from("notification_templates")
        .select("trigger_offset_minutes, trigger_type, trigger_condition")
        .eq("code", "shooting_pickup_reminder_digital")
        .single()
      const r = rem as {
        trigger_offset_minutes: number
        trigger_type: string
        trigger_condition: string | null
      } | null
      check(
        "shooting_pickup_reminder_digital unchanged (-30 / before / is_digital)",
        !!r &&
          r.trigger_offset_minutes === -30 &&
          r.trigger_type === "before" &&
          r.trigger_condition === "is_digital"
      )
    }
  } finally {
    await cleanup(cleanupIds)
    console.log(`Cleaned ${cleanupIds.length} test collections`)
  }

  const failed = rows.filter((r) => !r.pass)
  console.log(`\n${rows.length - failed.length}/${rows.length} passed`)
  if (failed.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
