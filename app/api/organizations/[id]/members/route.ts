import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapProfileToUser } from "@/lib/utils/supabase-mappers"
import type { Profile } from "@/lib/supabase/database.types"

type CreateMemberPayload = {
  firstName: string
  lastName?: string
  email: string
  /** Optional; when empty or omitted, profile.phone is set to null */
  phoneNumber?: string
  countryCode?: string
  role: "admin" | "editor" | "viewer"
}

async function getSessionProfile() {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    return { profile: null, error: userError?.message || "No session" }
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,is_internal,organization_id,role")
    .eq("id", userData.user.id)
    .maybeSingle()

  const profile = profileData as Pick<Profile, "id" | "is_internal" | "organization_id" | "role"> | null
  return {
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

  const { data: orgRow } = await adminClient
    .from("organizations")
    .select("type")
    .eq("id", organizationId)
    .maybeSingle()
  const orgType = (orgRow as { type?: string } | null)?.type
  const isNobaOrg = orgType === "noba"

  let userId: string | null = null
  const { data: createdUser, error: createUserError } =
    await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    })

  if (createUserError) {
    const message = createUserError.message.toLowerCase()
    if (message.includes("already") || message.includes("exists")) {
      // Resolve existing user: try profile first, then Auth (user may exist in Auth without a profile)
      const { data: existingProfileData } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle()
      const existingProfile = existingProfileData as Pick<Profile, "id"> | null
      userId = existingProfile?.id || null
      if (!userId) {
        const { data: listData } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
          page: 1,
        })
        const authUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email
        )
        userId = authUser?.id ?? null
      }
    } else {
      return NextResponse.json({ error: createUserError.message }, { status: 500 })
    }
  } else {
    userId = createdUser?.user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json(
      {
        error:
          createUserError &&
          (String(createUserError.message).toLowerCase().includes("already") ||
            String(createUserError.message).toLowerCase().includes("exists"))
            ? "User with this email already exists but could not be resolved. Try a different email or contact support."
            : "Unable to resolve user ID",
      },
      { status: 500 }
    )
  }

  const profilePayload = {
    id: userId,
    organization_id: organizationId,
    first_name: payload.firstName.trim(),
    last_name: payload.lastName?.trim() || null,
    email,
    phone: (payload.phoneNumber ?? "").trim() || null,
    prefix: (payload.countryCode ?? "").trim() || null,
    role: payload.role,
    is_internal: isNobaOrg,
  }

  const { data: updatedProfile, error: upsertError } = await adminClient
    .from("profiles")
    .upsert(profilePayload as never, { onConflict: "id" })
    .select("*")
    .maybeSingle()

  if (upsertError || !updatedProfile) {
    return NextResponse.json(
      { error: upsertError?.message || "Failed to create or update profile" },
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

  const { data: pendingInvites } = await adminClient
    .from("invitations")
    .select("email")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
  const pendingInviteEmails = new Set(
    (pendingInvites ?? []).map((r: { email: string }) => r.email.toLowerCase())
  )

  const updated = updatedProfile as Profile
  const members = (teamMembers || []) as Profile[]
  const users = members.map(mapProfileToUser)
  const teamMembersWithStatus = users.map((u) => ({
    ...u,
    status: pendingInviteEmails.has(u.email.toLowerCase())
      ? ("Invite sent" as const)
      : ("Active" as const),
  }))

  return NextResponse.json({
    user: mapProfileToUser(updated),
    teamMembers: teamMembersWithStatus,
  })
}
