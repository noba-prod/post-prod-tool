import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapProfileToUser } from "@/lib/utils/supabase-mappers"

type CreateMemberPayload = {
  firstName: string
  lastName?: string
  email: string
  phoneNumber: string
  countryCode: string
  role: "admin" | "editor" | "viewer"
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
    profile,
    error: profileError?.message || null,
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const { profile, error } = await getSessionProfile()
  if (!profile) {
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

  const payload = (await request.json()) as CreateMemberPayload
  const email = payload.email.toLowerCase().trim()
  const adminClient = createAdminClient()

  let userId: string | null = null
  const { data: createdUser, error: createUserError } =
    await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    })

  if (createUserError) {
    const message = createUserError.message.toLowerCase()
    if (message.includes("already") || message.includes("exists")) {
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle()
      userId = existingProfile?.id || null
    } else {
      return NextResponse.json({ error: createUserError.message }, { status: 500 })
    }
  } else {
    userId = createdUser.user?.id || null
  }

  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user ID" }, { status: 500 })
  }

  const { data: updatedProfile, error: updateError } = await adminClient
    .from("profiles")
    .update({
      organization_id: organizationId,
      first_name: payload.firstName.trim(),
      last_name: payload.lastName?.trim() || null,
      email,
      phone: payload.phoneNumber.trim(),
      prefix: payload.countryCode.trim(),
      role: payload.role,
    })
    .eq("id", userId)
    .select("*")
    .maybeSingle()

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to update profile" },
      { status: 500 }
    )
  }

  const { data: teamMembers, error: teamMembersError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)

  if (teamMembersError) {
    return NextResponse.json({ error: teamMembersError.message }, { status: 500 })
  }

  return NextResponse.json({
    user: mapProfileToUser(updatedProfile),
    teamMembers: (teamMembers || []).map(mapProfileToUser),
  })
}
