import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Profile } from "@/lib/supabase/database.types"
import { mapProfilesToUsers } from "@/lib/utils/supabase-mappers"

async function getSessionProfile(): Promise<{
  session: { user: { id: string } } | null
  profile: Pick<Profile, "id" | "is_internal" | "player_id" | "role"> | null
  error: string | null
}> {
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
 * DELETE /api/players/[id]/members/[userId]
 * Removes a user from the player (sets player_id to null).
 * Requires caller to be admin or editor of the same player.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const resolvedParams = await params
  const { profile, error } = await getSessionProfile()
  if (!profile) {
    return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
  }

  const playerId = resolvedParams.id
  const targetUserId = resolvedParams.userId

  const isInternal = Boolean(profile.is_internal)
  const canEditSamePlayer =
    profile.player_id === playerId &&
    (profile.role === "admin" || profile.role === "editor")

  if (!isInternal && !canEditSamePlayer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Prevent removing yourself from the player via this endpoint (optional: could allow "leave player")
  if (targetUserId === profile.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself. Use another admin to remove you, or leave the player from settings." },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()
  const { data: targetProfileData, error: targetError } = await adminClient
    .from("profiles")
    .select("id,player_id")
    .eq("id", targetUserId)
    .maybeSingle()
  const targetProfile = targetProfileData as Pick<Profile, "id" | "player_id"> | null

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (targetProfile.player_id !== playerId) {
    return NextResponse.json(
      { error: "User is not a member of this player" },
      { status: 400 }
    )
  }

  const { error: updateError } = await (adminClient.from("profiles") as any)
    .update({ player_id: null })
    .eq("id", targetUserId)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Failed to remove member" },
      { status: 500 }
    )
  }

  const { data: remainingProfilesData, error: listError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("player_id", playerId)
  const remainingProfiles = remainingProfilesData as Profile[] | null

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  return NextResponse.json({
    teamMembers: mapProfilesToUsers(remainingProfiles || []),
  })
}
