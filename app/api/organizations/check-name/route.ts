import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/organizations/check-name?name=...&excludeOrganizationId=...
 * Returns { exists: boolean } when an organization with that normalized name exists.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    return NextResponse.json({ error: sessionError?.message || "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const rawName = url.searchParams.get("name") ?? ""
  const excludeOrganizationId = url.searchParams.get("excludeOrganizationId")?.trim()
  const normalizedName = rawName.trim().toLowerCase()

  if (!normalizedName) {
    return NextResponse.json({ exists: false })
  }

  const adminClient = createAdminClient()
  let query = adminClient
    .from("organizations")
    .select("id,name")
    .ilike("name", rawName.trim())

  if (excludeOrganizationId) {
    query = query.neq("id", excludeOrganizationId)
  }

  const { data: rows, error } = await query.limit(5)

  if (error) {
    console.error("[check-organization-name] error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const exists = (rows ?? []).some((row: { name: string }) => row.name.trim().toLowerCase() === normalizedName)
  return NextResponse.json({ exists })
}
