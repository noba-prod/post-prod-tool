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
  profilePictureUrl?: string | null
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
  const canEditSelf = profile.id === targetUserId
  const canEditSameOrg =
    !canEditSelf &&
    profile.organization_id &&
    targetForEdit.organization_id &&
    profile.organization_id === targetForEdit.organization_id &&
    (profile.role === "admin" || profile.role === "editor")

  if (!isInternal && !canEditSelf && !canEditSameOrg) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const payload = (await request.json()) as UpdateUserPayload
  const newEmail = payload.email !== undefined ? payload.email.toLowerCase().trim() : undefined
  const currentEmail = (targetForEdit as { email?: string | null }).email?.trim().toLowerCase()

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
  if (newEmail !== undefined && !canEditSelf) {
    update.email = newEmail
  }
  if (payload.role !== undefined && !canEditSelf) {
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

  // When email changes: update auth.users so the user can log in with the new email.
  // To send a confirmation email: enable "Secure email change" in Supabase Dashboard
  // (Auth > Providers > Email) and configure the "Change email address" template in
  // Auth > Email Templates. Supabase will send the confirmation when configured.
  if (newEmail && currentEmail && newEmail !== currentEmail) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, {
      email: newEmail,
      // Do not set email_confirm: true — allows Supabase to send confirmation when Secure email change is enabled
    })
    if (authError) {
      console.error("[users PATCH] auth updateUserById error:", authError)
      return NextResponse.json(
        { error: authError.message || "Failed to update email" },
        { status: 500 }
      )
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

  // For self-photographer: sync organizations.profile_picture_url when profile image changes
  if (payload.profilePictureUrl !== undefined && targetForEdit.organization_id) {
    const { data: orgRow } = await adminClient
      .from("organizations")
      .select("type")
      .eq("id", targetForEdit.organization_id)
      .maybeSingle()
    const orgType = (orgRow as { type?: string } | null)?.type
    if (orgType === "self_photographer") {
      await adminClient
        .from("organizations")
        .update({ profile_picture_url: payload.profilePictureUrl } as never)
        .eq("id", targetForEdit.organization_id)
    }
  }

  const updated = updatedProfile as Profile
  return NextResponse.json({ user: mapProfileToUser(updated) })
}
