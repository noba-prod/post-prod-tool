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
    console.warn("Organizations debug: no session, allowing debug fetch")
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey === "placeholder-service-key") {
    return NextResponse.json(
      {
        error: "Missing SUPABASE_SERVICE_ROLE_KEY for organizations fetch",
      },
      { status: 500 }
    )
  }

  const userId = sessionData.session?.user?.id || null
  let profileData: {
    id: string
    email: string
    is_internal: boolean
    organization_id: string | null
    role: string | null
  } | null = null

  if (userId) {
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,is_internal,organization_id,role")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("Organizations debug: failed to load profile", profileError)
    } else {
      profileData = profileRow
    }
  }

  const adminClient = createAdminClient()
  const [organizationsResult, profilesResult, collectionsResult] = await Promise.all([
    adminClient.from("organizations").select("id,name,type").order("name", { ascending: true }),
    adminClient.from("profiles").select("id,organization_id,first_name,last_name,email,role,is_internal"),
    adminClient.from("collections").select("id,client_id"),
  ])

  if (organizationsResult.error) {
    console.error("Organizations debug: organizations error", organizationsResult.error)
    return NextResponse.json({ error: organizationsResult.error.message }, { status: 500 })
  }

  if (profilesResult.error) {
    console.error("Organizations debug: profiles error", profilesResult.error)
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
  }

  if (collectionsResult.error) {
    console.error("Organizations debug: collections error", collectionsResult.error)
    return NextResponse.json({ error: collectionsResult.error.message }, { status: 500 })
  }

  const organizations = organizationsResult.data || []
  const profiles = profilesResult.data || []
  const collections = collectionsResult.data || []

  if (debugEnabled) {
    console.info("Organizations debug snapshot", {
      userId,
      profile: profileData || null,
      organizationsCount: organizations.length,
      profilesCount: profiles.length,
      collectionsCount: collections.length,
    })
  }

  return NextResponse.json({
    organizations,
    profiles,
    collections,
    debug: debugEnabled
      ? {
          userId,
          profile: profileData || null,
          organizationsCount: organizations.length,
          profilesCount: profiles.length,
          collectionsCount: collections.length,
        }
      : undefined,
  })
}
