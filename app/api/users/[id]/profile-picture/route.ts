import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Profile } from "@/lib/supabase/database.types"

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
 * POST /api/users/[id]/profile-picture
 * Uploads a profile picture for the user and updates profiles.image.
 * Accepts FormData with "file" key.
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

  const formData = await request.formData()
  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Expected FormData with 'file' key." },
      { status: 400 }
    )
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png"
  const objectPath = `profiles/${targetUserId}/avatar.${extension}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await adminClient.storage
    .from("profile-pictures")
    .upload(objectPath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    console.error("Profile picture upload failed:", uploadError)
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

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ image: profilePictureUrl } as never)
    .eq("id", targetUserId)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Failed to update profile" },
      { status: 500 }
    )
  }

  return NextResponse.json({ profilePictureUrl })
}
