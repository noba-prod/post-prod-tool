import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/users/check-email?email=...
 * Returns { exists: boolean } whether a profile with that email already exists.
 * Used to validate email uniqueness when registering a new team member.
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
  if (!email) {
    return NextResponse.json({ exists: false })
  }

  const adminClient = createAdminClient()
  const { data: rows, error } = await adminClient
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .limit(1)

  if (error) {
    console.error("[check-email] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ exists: (rows?.length ?? 0) > 0 })
}
