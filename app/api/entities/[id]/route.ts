import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapOrganizationToEntity, mapProfilesToUsers } from "@/lib/utils/supabase-mappers"
import { parsePhoneNumber } from "@/lib/utils/form-mappers"

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,is_internal,organization_id,role")
    .eq("id", sessionData.session.user.id)
    .maybeSingle()

  return {
    session: sessionData.session,
    profile: profile,
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

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const entity = mapOrganizationToEntity(organization)
  const teamMembers = mapProfilesToUsers(profiles || [])
  const adminUsers = teamMembers.filter((user) => user.role === "admin")
  const adminUser = adminUsers.length > 0 ? adminUsers[0] : null

  return NextResponse.json({
    entity,
    teamMembers,
    adminUsers,
    adminUser,
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
  const { data: organization, error: updateError } = await adminClient
    .from("organizations")
    .update(update)
    .eq("id", organizationId)
    .select("*")
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!organization) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 })
  }

  return NextResponse.json({ entity: mapOrganizationToEntity(organization) })
}
