/** Creates a Drop2-like collection in the current Supabase env and prints its id. */
import { createClient } from "@supabase/supabase-js"

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { data: player } = await sb.from("players").select("id").limit(1).single()
  const { data: producers } = await sb.from("profiles").select("id").eq("is_internal", true).limit(2)
  const end = new Date(Date.now() - 3 * 24 * 3600 * 1000)
  const { data: col, error } = await sb
    .from("collections")
    .insert({
      name: `BACKFILL FIXTURE DROP2-LIKE ${Date.now()}`,
      client_id: (player as { id: string }).id,
      status: "in_progress",
      substatus: "shooting",
      low_res_to_high_res_digital: true,
      low_res_to_high_res_hand_print: false,
      photographer_request_edition: false,
      photographer_collaborates_with_agency: false,
      handprint_different_from_original_lab: false,
      shooting_end_date: end.toISOString().slice(0, 10),
      shooting_end_time: end.toISOString().slice(11, 19),
      step_statuses: {},
      completion_percentage: 0,
      workflow_revision: 1,
    } as never)
    .select("id")
    .single()
  if (error || !col) throw error ?? new Error("insert failed")
  for (const p of producers as { id: string }[]) {
    await sb.from("collection_members").insert({
      collection_id: (col as { id: string }).id,
      user_id: p.id,
      role: "noba",
      can_edit: true,
    } as never)
  }
  console.log((col as { id: string }).id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
