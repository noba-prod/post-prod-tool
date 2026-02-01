import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parsePhoneNumber } from "@/lib/utils/form-mappers"
import { mapProfileToUser } from "@/lib/utils/supabase-mappers"
import type { Profile } from "@/lib/supabase/database.types"

type UpdateUserPayload = {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  countryCode?: string
  role?: "admin" | "editor" | "viewer"
  profilePictureUrl?: string
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { profile, error } = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
  }

  const targetUserId = resolvedParams.id
  const adminClient = createAdminClient()
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle()

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const target = targetProfile as Profile
  const isInternal = Boolean(profile.is_internal)
  const canViewSameOrg =
    profile.organization_id &&
    target.organization_id &&
    profile.organization_id === target.organization_id

  if (!isInternal && !canViewSameOrg) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ user: mapProfileToUser(target) })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { profile, error } = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
  }

  const targetUserId = resolvedParams.id
  const adminClient = createAdminClient()
  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", targetUserId)
    .maybeSingle()

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const targetForEdit = targetProfile as Profile
  const isInternal = Boolean(profile.is_internal)
  const canEditSameOrg =
    profile.organization_id &&
    targetForEdit.organization_id &&
    profile.organization_id === targetForEdit.organization_id &&
    (profile.role === "admin" || profile.role === "editor")

  if (!isInternal && !canEditSameOrg) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = (await request.json()) as UpdateUserPayload
  const update: {
    first_name?: string
    last_name?: string | null
    email?: string
    phone?: string | null
    prefix?: string | null
    role?: "admin" | "editor" | "viewer" | null
    image?: string | null
  } = {}

  if (payload.firstName !== undefined) {
    update.first_name = payload.firstName.trim()
  }
  if (payload.lastName !== undefined) {
    update.last_name = payload.lastName?.trim() || null
  }
  if (payload.email !== undefined) {
    update.email = payload.email.toLowerCase().trim()
  }
  if (payload.role !== undefined) {
    update.role = payload.role
  }
  if (payload.profilePictureUrl !== undefined) {
    update.image = payload.profilePictureUrl || null
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

  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update(update as never)
    .eq("id", targetUserId)
    .select("*")
    .maybeSingle()

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to update user" },
      { status: 500 }
    )
  }

  const updated = updatedProfile as Profile
  return NextResponse.json({ user: mapProfileToUser(updated) })
}
