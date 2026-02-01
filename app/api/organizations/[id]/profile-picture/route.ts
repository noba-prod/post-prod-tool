import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Profile, Organization } from "@/lib/supabase/database.types"
import { mapOrganizationToEntity } from "@/lib/utils/supabase-mappers"

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

/**
 * POST /api/organizations/[id]/profile-picture
 * Uploads a profile picture for the organization and updates organizations.profile_picture_url.
 * Accepts FormData with "file" key.
 * Internal users (is_internal=true) can edit any organization. Org admins/editors can edit their own.
 */
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

  const adminClient = createAdminClient()
  const { data: organization, error: orgError } = await adminClient
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError || !organization) {
    return NextResponse.json(
      { error: orgError?.message || "Organization not found" },
      { status: orgError ? 500 : 404 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Expected FormData with 'file' key." },
      { status: 400 }
    )
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png"
  const objectPath = `${organizationId}/logo.${extension}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await adminClient.storage
    .from("profile-pictures")
    .upload(objectPath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    console.error("Organization profile picture upload failed:", uploadError)
    return NextResponse.json(
      { error: uploadError.message || "Failed to upload profile picture" },
      { status: 500 }
    )
  }

  const { data } = adminClient.storage
    .from("profile-pictures")
    .getPublicUrl(objectPath)

  const profilePictureUrl = data.publicUrl || null
  if (!profilePictureUrl) {
    return NextResponse.json(
      { error: "Failed to get public URL" },
      { status: 500 }
    )
  }

  const { data: updatedOrg, error: updateError } = await adminClient
    .from("organizations")
    .update({ profile_picture_url: profilePictureUrl } as never)
    .eq("id", organizationId)
    .select("*")
    .maybeSingle()

  if (updateError || !updatedOrg) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to update organization" },
      { status: 500 }
    )
  }

  const org = updatedOrg as Organization
  return NextResponse.json({
    profilePictureUrl,
    entity: mapOrganizationToEntity(org),
  })
}
