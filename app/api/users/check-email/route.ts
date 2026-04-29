import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/users/check-email?email=...&excludeUserId=...
 * Returns:
 * - exists: true when email is already assigned and cannot be reused.
 * - reusable: true when a profile exists but can be adopted (no org + non-internal).
 * Used to validate email uniqueness when registering or editing a team member.
 * excludeUserId: when editing, pass the user id to exclude from the check (so current user's email is not flagged).
 */
export async function GET(request: Request) {
  const { profile, error: sessionError } = await (async () => {
    const supabase = await createClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      return { profile: null, error: sessionError?.message || "No session" }
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,is_internal")
      .eq("id", sessionData.session.user.id)
      .maybeSingle()
    return { profile, error: profileError?.message || null }
  })()

  if (!profile) {
    return NextResponse.json({ error: sessionError || "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get("email")?.trim()
  const excludeUserId = url.searchParams.get("excludeUserId")?.trim()
  if (!email) {
    return NextResponse.json({ exists: false })
  }

  const adminClient = createAdminClient()
  let query = adminClient
    .from("profiles")
    .select("id,organization_id,is_internal")
    .ilike("email", email)
  if (excludeUserId) {
    query = query.neq("id", excludeUserId)
  }
  const { data: rows, error } = await query.limit(1)

  if (error) {
    console.error("[check-email] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const existing = rows?.[0] as
    | { id: string; organization_id: string | null; is_internal: boolean | null }
    | undefined

  if (!existing) {
    return NextResponse.json({ exists: false, reusable: false })
  }

  const reusable = !existing.organization_id && !existing.is_internal
  const exists = !reusable

  return NextResponse.json({ exists, reusable })
}
