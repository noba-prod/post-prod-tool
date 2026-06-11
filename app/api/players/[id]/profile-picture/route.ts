import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  ensureProfilePicturesBucket,
  PROFILE_PICTURES_BUCKET,
} from "@/lib/supabase/ensure-profile-pictures-bucket"
import type { Profile, Player } from "@/lib/supabase/database.types"
import { mapPlayerToEntity } from "@/lib/utils/supabase-mappers"

async function getSessionProfile() {
  const supabase = await createClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    return { session: null, profile: null, error: sessionError?.message || "No session" }
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,is_internal,player_id,role")
    .eq("id", sessionData.session.user.id)
    .maybeSingle()

  const profile = profileData as Pick<Profile, "id" | "is_internal" | "player_id" | "role"> | null
  return {
    session: sessionData.session,
    profile,
    error: profileError?.message || null,
  }
}

/**
 * POST /api/players/[id]/profile-picture
 * Uploads a profile picture for the player and updates players.profile_picture_url.
 * Accepts FormData with "file" key.
 * Internal users (is_internal=true) can edit any player. Org admins/editors can edit their own.
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

  const playerId = resolvedParams.id
  const isInternal = Boolean(profile.is_internal)
  const canEditSamePlayer =
    profile.player_id === playerId &&
    (profile.role === "admin" || profile.role === "editor")

  if (!isInternal && !canEditSamePlayer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data: player, error: playerError } = await adminClient
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle()

  if (playerError || !player) {
    return NextResponse.json(
      { error: playerError?.message || "Player not found" },
      { status: playerError ? 500 : 404 }
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
  const objectPath = `${playerId}/logo.${extension}`
  const arrayBuffer = await file.arrayBuffer()

  try {
    await ensureProfilePicturesBucket(adminClient)
  } catch (bucketError) {
    console.error("Profile pictures bucket setup failed:", bucketError)
    return NextResponse.json(
      { error: "Profile picture storage is not configured. Contact support." },
      { status: 500 }
    )
  }

  const { error: uploadError } = await adminClient.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (uploadError) {
    console.error("Player profile picture upload failed:", uploadError)
    return NextResponse.json(
      { error: uploadError.message || "Failed to upload profile picture" },
      { status: 500 }
    )
  }

  const { data } = adminClient.storage
    .from(PROFILE_PICTURES_BUCKET)
    .getPublicUrl(objectPath)

  const profilePictureUrl = data.publicUrl || null
  if (!profilePictureUrl) {
    return NextResponse.json(
      { error: "Failed to get public URL" },
      { status: 500 }
    )
  }

  const { data: updatedPlayer, error: updateError } = await adminClient
    .from("players")
    .update({ profile_picture_url: profilePictureUrl } as never)
    .eq("id", playerId)
    .select("*")
    .maybeSingle()

  if (updateError || !updatedPlayer) {
    return NextResponse.json(
      { error: updateError?.message || "Failed to update player" },
      { status: 500 }
    )
  }

  const p = updatedPlayer as Player
  return NextResponse.json({
    profilePictureUrl,
    entity: mapPlayerToEntity(p),
  })
}
