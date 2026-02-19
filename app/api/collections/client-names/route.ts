import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const idsParam = url.searchParams.get("ids") ?? ""
    const requestedIds = [...new Set(
      idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )]

    if (requestedIds.length === 0) {
      return NextResponse.json({ namesById: {} })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Resolve only client ids from collections visible to the current user (RLS).
    const { data: visibleCollections, error: visibleCollectionsError } = await supabase
      .from("collections")
      .select("client_id")
      .in("client_id", requestedIds)

    if (visibleCollectionsError) {
      return NextResponse.json(
        { error: "Failed to resolve visible clients" },
        { status: 500 }
      )
    }

    const visibleClientIds = [...new Set(
      (visibleCollections ?? [])
        .map((row: { client_id: string | null }) => row.client_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    )]

    if (visibleClientIds.length === 0) {
      return NextResponse.json({ namesById: {} })
    }

    const admin = createAdminClient()
    const { data: organizations, error: organizationsError } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", visibleClientIds)

    if (organizationsError) {
      return NextResponse.json(
        { error: "Failed to load client names" },
        { status: 500 }
      )
    }

    const namesById: Record<string, string> = {}
    for (const org of organizations ?? []) {
      const id = (org as { id?: string }).id
      const name = (org as { name?: string }).name
      if (id && name) namesById[id] = name
    }

    return NextResponse.json({ namesById })
  } catch (error) {
    console.error("[GET /api/collections/client-names]", error)
    return NextResponse.json(
      { error: "Failed to load client names" },
      { status: 500 }
    )
  }
}
