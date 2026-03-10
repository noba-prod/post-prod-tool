import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapOrganizationToEntity, mapProfilesToUsers } from "@/lib/utils/supabase-mappers"
import { parsePhoneNumber } from "@/lib/utils/form-mappers"
import type { Profile, Organization } from "@/lib/supabase/database.types"

type EntityUpdatePayload = {
  name?: string
  email?: string
  phoneNumber?: string
  countryCode?: string
  profilePictureUrl?: string
  notes?: string
  location?: {
    streetAddress?: string
    zipCode?: string
    city?: string
    country?: string
  }
}

async function getSessionProfile() {
  const supabase = await createClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    return { session: null, profile: null, error: sessionError?.message || "No session" }
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,is_internal,organization_id,role")
    .eq("id", sessionData.session.user.id)
    .maybeSingle()

  const profile = profileData as Pick<Profile, "id" | "is_internal" | "organization_id" | "role"> | null
  return {
    session: sessionData.session,
    profile,
    error: profileError?.message || null,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const url = new URL(request.url)
  const debugEnabled = url.searchParams.get("debug") === "1"
  const allowAnonymousRead = debugEnabled || process.env.NODE_ENV !== "production"
  const { session, profile, error } = await getSessionProfile()
  if (!session || !profile) {
    if (!allowAnonymousRead) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }
    console.warn("Entities detail: no session, allowing dev/debug read")
  }

  const organizationId = resolvedParams.id
  if (profile) {
    const isInternal = Boolean(profile.is_internal)
    if (!isInternal && profile.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const adminClient = createAdminClient()
  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle()

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 })
  }

  if (!organization) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 })
  }

  const org = organization as Organization
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const entity = mapOrganizationToEntity(org)
  const teamMembersBase = mapProfilesToUsers((profiles || []) as Profile[])

  const { data: pendingInvites } = await adminClient
    .from("invitations")
    .select("email")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
  const pendingInviteEmails = new Set(
    (pendingInvites ?? []).map((r: { email: string }) => r.email.toLowerCase())
  )
  const teamMembers = teamMembersBase.map((user) => ({
    ...user,
    status: pendingInviteEmails.has(user.email.toLowerCase())
      ? ("Invite sent" as const)
      : ("Active" as const),
  }))

  const adminUsers = teamMembersBase.filter((user) => user.role === "admin")
  const adminUser = adminUsers.length > 0 ? adminUsers[0] : null

  // Collections where this entity is invited (client or participant: photographer, lab, edition studio, handprint lab)
  const { data: collectionsRows } = await adminClient
    .from("collections")
    .select("id, name, status, client_id, reference, shooting_start_date, shooting_end_date, shooting_city, shooting_country")
    .or(
      `client_id.eq.${organizationId},photographer_id.eq.${organizationId},photo_lab_id.eq.${organizationId},retouch_studio_id.eq.${organizationId},handprint_lab_id.eq.${organizationId}`
    )
    .order("updated_at", { ascending: false })

  const collectionsList: Array<{
    id: string
    name: string
    status: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
    clientName: string
    reference?: string
    location: string
    startDate: string
    endDate: string
    participants: number
  }> = []

  if (collectionsRows && collectionsRows.length > 0) {
    const clientIds = [...new Set((collectionsRows as { client_id: string }[]).map((c) => c.client_id))]
    const { data: clientOrgs } = await adminClient
      .from("organizations")
      .select("id, name")
      .in("id", clientIds)
    const clientNameById = new Map<string, string>()
    for (const org of clientOrgs || []) {
      clientNameById.set((org as { id: string; name: string }).id, (org as { id: string; name: string }).name)
    }

    const collectionIds = (collectionsRows as { id: string }[]).map((c) => c.id)
    const { data: memberCounts } = await adminClient
      .from("collection_members")
      .select("collection_id")
    const participantsByCollectionId = new Map<string, number>()
    for (const cid of collectionIds) {
      const count = (memberCounts || []).filter((m: { collection_id: string }) => m.collection_id === cid).length
      participantsByCollectionId.set(cid, count)
    }

    const formatDate = (d: string | null): string => {
      if (!d) return "—"
      try {
        return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase()
      } catch {
        return d
      }
    }

    const normalizeStatus = (s: string): "draft" | "upcoming" | "in-progress" | "completed" | "canceled" => {
      if (s === "in_progress") return "in-progress"
      if (["draft", "upcoming", "completed", "canceled"].includes(s)) return s as "draft" | "upcoming" | "completed" | "canceled"
      return "draft"
    }

    const isInternal = Boolean(profile?.is_internal)
    for (const row of collectionsRows as Array<{
      id: string
      name: string
      status: string
      client_id: string
      reference: string | null
      shooting_start_date: string | null
      shooting_end_date: string | null
      shooting_city: string | null
      shooting_country: string | null
    }>) {
      // Non-Noba users never see draft collections (client, photo_lab, handprint_lab, photographer, agency, retouch_studio)
      if (!isInternal && row.status === "draft") continue
      const location = [row.shooting_city, row.shooting_country].filter(Boolean).join(", ") || "—"
      collectionsList.push({
        id: row.id,
        name: row.name,
        status: normalizeStatus(row.status),
        clientName: clientNameById.get(row.client_id) || "—",
        reference: row.reference?.trim() || undefined,
        location,
        startDate: formatDate(row.shooting_start_date),
        endDate: formatDate(row.shooting_end_date),
        participants: participantsByCollectionId.get(row.id) ?? 0,
      })
    }
  }

  return NextResponse.json({
    entity,
    teamMembers,
    adminUsers,
    adminUser,
    collectionsList,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { session, profile, error } = await getSessionProfile()
  if (!session || !profile) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
  }

  const organizationId = resolvedParams.id
  const isInternal = Boolean(profile.is_internal)
  const canEditSameOrg =
    profile.organization_id === organizationId &&
    (profile.role === "admin" || profile.role === "editor")

  if (!isInternal && !canEditSameOrg) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = (await request.json()) as EntityUpdatePayload
  const update: {
    name?: string
    email?: string | null
    phone?: string | null
    prefix?: string | null
    profile_picture_url?: string | null
    notes?: string | null
    street_address?: string | null
    zip_code?: string | null
    city?: string | null
    country?: string | null
  } = {}

  if (payload.name !== undefined) {
    update.name = payload.name.trim()
  }
  if (payload.email !== undefined) {
    update.email = payload.email?.trim() || null
  }
  if (payload.profilePictureUrl !== undefined) {
    update.profile_picture_url = payload.profilePictureUrl || null
  }
  if (payload.notes !== undefined) {
    update.notes = payload.notes?.trim() || null
  }
  if (payload.location) {
    update.street_address = payload.location.streetAddress?.trim() || null
    update.zip_code = payload.location.zipCode?.trim() || null
    update.city = payload.location.city?.trim() || null
    update.country = payload.location.country?.trim() || null
  }

  if (payload.phoneNumber !== undefined || payload.countryCode !== undefined) {
    if (payload.phoneNumber && payload.countryCode) {
      update.prefix = payload.countryCode.trim()
      update.phone = payload.phoneNumber.trim()
    } else if (payload.phoneNumber) {
      const parsed = parsePhoneNumber(payload.phoneNumber)
      update.prefix = parsed.countryCode?.trim() || null
      update.phone = parsed.phoneNumber?.trim() || null
    } else if (payload.countryCode) {
      update.prefix = payload.countryCode.trim()
      update.phone = null
    }
  }

  const adminClient = createAdminClient()
  const { data: organizationData, error: updateError } = await adminClient
    .from("organizations")
    .update(update as never)
    .eq("id", organizationId)
    .select("*")
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!organizationData) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 })
  }

  const updatedOrg = organizationData as Organization
  return NextResponse.json({ entity: mapOrganizationToEntity(updatedOrg) })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { session, profile, error } = await getSessionProfile()
  if (!session || !profile) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
  }

  const organizationId = resolvedParams.id
  const isInternal = Boolean(profile.is_internal)
  const canEditSameOrg =
    profile.organization_id === organizationId &&
    (profile.role === "admin" || profile.role === "editor")

  if (!isInternal && !canEditSameOrg) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { error: deleteError } = await adminClient
    .from("organizations")
    .delete()
    .eq("id", organizationId)

  if (deleteError) {
    if (deleteError.code === "23503") {
      return NextResponse.json(
        { error: "Cannot delete entity: it is referenced by other data (e.g. collections, team members)." },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
