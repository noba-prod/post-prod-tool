import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const debugEnabled = url.searchParams.get("debug") === "1"
  const limitParam = url.searchParams.get("limit")
  const offsetParam = url.searchParams.get("offset")
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : null
  const parsedOffset = offsetParam ? Number.parseInt(offsetParam, 10) : 0
  const usePagination = parsedLimit !== null && Number.isFinite(parsedLimit) && parsedLimit > 0
  const limit = usePagination ? parsedLimit : null
  const offset = usePagination && Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0
  const supabase = await createClient()

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    if (!debugEnabled) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          debug: debugEnabled ? { sessionError: sessionError?.message || "No session" } : undefined,
        },
        { status: 401 }
      )
    }
    console.warn("Players debug: no session, allowing debug fetch")
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === "placeholder-service-key") {
    return NextResponse.json(
      {
        error: "Missing SUPABASE_SERVICE_ROLE_KEY for players fetch",
      },
      { status: 500 }
    )
  }

  const userId = sessionData.session?.user?.id || null
  let profileData: {
    id: string
    email: string
    is_internal: boolean
    player_id: string | null
    role: string | null
  } | null = null

  if (userId) {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,is_internal,player_id,role")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("Players debug: failed to load profile", profileError)
    } else {
      profileData = profileRow
    }
  }

  const adminClient = createAdminClient()

  let playersQuery = adminClient
    .from("players")
    .select("id,name,type")
    .order("name", { ascending: true })

  if (usePagination && limit !== null) {
    playersQuery = playersQuery.range(offset, offset + limit)
  }

  const [playersResult, profilesResult, collectionsResult, membersResult] =
    await Promise.all([
      playersQuery,
      adminClient.from("profiles").select("id,player_id,first_name,last_name,email,role,is_internal"),
      adminClient
        .from("collections")
        .select("id,client_id,photographer_id,photo_lab_id,retouch_studio_id,handprint_lab_id"),
      adminClient.from("collection_members").select("collection_id,user_id"),
    ])

  if (playersResult.error) {
    console.error("Players debug: players error", playersResult.error)
    return NextResponse.json({ error: playersResult.error.message }, { status: 500 })
  }

  if (profilesResult.error) {
    console.error("Players debug: profiles error", profilesResult.error)
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
  }

  if (collectionsResult.error) {
    console.error("Players debug: collections error", collectionsResult.error)
    return NextResponse.json({ error: collectionsResult.error.message }, { status: 500 })
  }

  if (membersResult.error) {
    console.error("Players debug: collection_members error", membersResult.error)
    return NextResponse.json({ error: membersResult.error.message }, { status: 500 })
  }

  const players = (playersResult.data ?? []) as Array<{ id: string; name: string; type: string }>
  const profiles = (profilesResult.data ?? []) as Array<{
    id: string
    player_id: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    is_internal: boolean | null
  }>
  const collections = collectionsResult.data || []
  const collectionMembers = membersResult.data || []
  const hasMore = usePagination && limit !== null ? players.length > limit : false
  const pagePlayers = usePagination && limit !== null && hasMore ? players.slice(0, limit) : players
  const pagePlayerIds = new Set(pagePlayers.map((player) => player.id))
  const scopedProfiles = usePagination
    ? profiles.filter(
        (profile) => profile.player_id && pagePlayerIds.has(profile.player_id)
      )
    : profiles

  if (debugEnabled) {
    console.info("Players debug snapshot", {
      userId,
      profile: profileData || null,
      playersCount: pagePlayers.length,
      profilesCount: profiles.length,
      collectionsCount: collections.length,
    })
  }

  return NextResponse.json({
    players: pagePlayers,
    profiles: scopedProfiles,
    collections,
    collectionMembers,
    hasMore: usePagination ? hasMore : undefined,
    debug: debugEnabled
      ? {
          userId,
          profile: profileData || null,
          playersCount: pagePlayers.length,
          profilesCount: profiles.length,
          collectionsCount: collections.length,
        }
      : undefined,
  })
}
