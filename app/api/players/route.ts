import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const debugEnabled = url.searchParams.get("debug") === "1"
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
  const [playersResult, profilesResult, collectionsResult, membersResult] =
    await Promise.all([
      adminClient.from("players").select("id,name,type").order("name", { ascending: true }),
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

  const players = playersResult.data || []
  const profiles = profilesResult.data || []
  const collections = collectionsResult.data || []
  const collectionMembers = membersResult.data || []

  if (debugEnabled) {
    console.info("Players debug snapshot", {
      userId,
      profile: profileData || null,
      playersCount: players.length,
      profilesCount: profiles.length,
      collectionsCount: collections.length,
    })
  }

  return NextResponse.json({
    players,
    profiles,
    collections,
    collectionMembers,
    debug: debugEnabled
      ? {
          userId,
          profile: profileData || null,
          playersCount: players.length,
          profilesCount: profiles.length,
          collectionsCount: collections.length,
        }
      : undefined,
  })
}
