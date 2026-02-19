import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { SupabaseCollectionsRepository } from "@/lib/infra/collections/supabase-collections.repository"

type DbRole =
  | "client"
  | "photographer"
  | "agency"
  | "photo_lab"
  | "retouch_studio"
  | "handprint_lab"

function toHandle(name: string): string {
  return `@${name.trim().toLowerCase().replace(/\s+/g, "")}`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check visibility with user-level RLS.
    const userRepo = new SupabaseCollectionsRepository(supabase)
    const canView = await userRepo.getById(id)
    if (!canView) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const admin = createAdminClient()
    const { data: collectionRow, error: collectionError } = await admin
      .from("collections")
      .select("id, client_id")
      .eq("id", id)
      .maybeSingle()

    if (collectionError || !collectionRow) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const { data: members, error: membersError } = await admin
      .from("collection_members")
      .select("role, user_id")
      .eq("collection_id", id)

    if (membersError) {
      return NextResponse.json(
        { error: "Failed to load collection members" },
        { status: 500 }
      )
    }

    const memberCountByRole: Record<DbRole, number> = {
      client: 0,
      photographer: 0,
      agency: 0,
      photo_lab: 0,
      retouch_studio: 0,
      handprint_lab: 0,
    }

    const userIdsByRole: Record<DbRole, string[]> = {
      client: [],
      photographer: [],
      agency: [],
      photo_lab: [],
      retouch_studio: [],
      handprint_lab: [],
    }

    for (const row of members ?? []) {
      const role = (row as { role?: string }).role as DbRole | undefined
      const userId = (row as { user_id?: string }).user_id
      if (!role || !(role in memberCountByRole)) continue
      memberCountByRole[role] += 1
      if (userId) userIdsByRole[role].push(userId)
    }

    const allUserIds = [...new Set(Object.values(userIdsByRole).flat())]
    const userOrgIdByUserId = new Map<string, string>()
    if (allUserIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, organization_id")
        .in("id", allUserIds)
      for (const profile of profiles ?? []) {
        const p = profile as { id?: string; organization_id?: string | null }
        if (p.id && p.organization_id) userOrgIdByUserId.set(p.id, p.organization_id)
      }
    }

    const orgIds = new Set<string>()
    const roleOrgId: Partial<Record<DbRole, string>> = {}

    for (const role of Object.keys(userIdsByRole) as DbRole[]) {
      const firstUserId = userIdsByRole[role][0]
      if (!firstUserId) continue
      const orgId = userOrgIdByUserId.get(firstUserId)
      if (!orgId) continue
      roleOrgId[role] = orgId
      orgIds.add(orgId)
    }

    const clientOrgId = (collectionRow as { client_id?: string | null }).client_id ?? null
    if (clientOrgId) orgIds.add(clientOrgId)

    const orgNameById = new Map<string, string>()
    if (orgIds.size > 0) {
      const { data: organizations } = await admin
        .from("organizations")
        .select("id, name")
        .in("id", [...orgIds])
      for (const org of organizations ?? []) {
        const o = org as { id?: string; name?: string }
        if (o.id && o.name) orgNameById.set(o.id, o.name)
      }
    }

    const handleByRole: Partial<Record<DbRole, string>> = {}
    if (clientOrgId) {
      const clientName = orgNameById.get(clientOrgId)
      if (clientName) handleByRole.client = toHandle(clientName)
    }

    for (const role of ([
      "photographer",
      "agency",
      "photo_lab",
      "retouch_studio",
      "handprint_lab",
    ] as const)) {
      const orgId = roleOrgId[role]
      if (!orgId) continue
      const orgName = orgNameById.get(orgId)
      if (!orgName) continue
      handleByRole[role] = toHandle(orgName)
    }

    return NextResponse.json({
      handleByRole,
      memberCountByRole,
    })
  } catch (error) {
    console.error("[GET /api/collections/[id]/publish-participants]", error)
    return NextResponse.json(
      { error: "Failed to load publish participants" },
      { status: 500 }
    )
  }
}
