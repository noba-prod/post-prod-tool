import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type VisibleCollectionRow = { id: string; photographer_id: string | null }
type PlayerNameRow = { id: string; name: string }
type PhotographerMemberRow = { user_id: string }
type ProfileNameRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // RLS limits this query to collections the current user can see.
    const { data: visibleCollections, error: collectionsError } = await supabase
      .from("collections")
      .select("id, photographer_id")

    if (collectionsError) {
      return NextResponse.json(
        { error: "Failed to resolve visible photographers" },
        { status: 500 }
      )
    }

    const visibleRows = (visibleCollections ?? []) as unknown as VisibleCollectionRow[]
    const collectionIds = visibleRows.map((collection) => collection.id)
    const entityIds = [...new Set(
      visibleRows
        .map((collection) => collection.photographer_id)
        .filter((id): id is string => Boolean(id))
    )]

    const admin = createAdminClient()
    const entityNamesById: Record<string, string> = {}
    const userNamesById: Record<string, string> = {}

    if (entityIds.length > 0) {
      const { data: players, error: playersError } = await admin
        .from("players")
        .select("id, name")
        .in("id", entityIds)

      if (playersError) {
        return NextResponse.json(
          { error: "Failed to load photographer entities" },
          { status: 500 }
        )
      }

      for (const player of (players ?? []) as unknown as PlayerNameRow[]) {
        if (player.id && player.name) entityNamesById[player.id] = player.name
      }
    }

    if (collectionIds.length > 0) {
      const { data: members, error: membersError } = await admin
        .from("collection_members")
        .select("user_id")
        .in("collection_id", collectionIds)
        .eq("role", "photographer")

      if (membersError) {
        return NextResponse.json(
          { error: "Failed to load photographer members" },
          { status: 500 }
        )
      }

      const memberRows = (members ?? []) as unknown as PhotographerMemberRow[]
      const userIds = [...new Set(memberRows.map((member) => member.user_id))]
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await admin
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds)

        if (profilesError) {
          return NextResponse.json(
            { error: "Failed to load photographer profiles" },
            { status: 500 }
          )
        }

        for (const profile of (profiles ?? []) as unknown as ProfileNameRow[]) {
          const name = `${profile.first_name?.trim() ?? ""} ${profile.last_name?.trim() ?? ""}`.trim()
          if (name) userNamesById[profile.id] = name
        }
      }
    }

    return NextResponse.json({ entityNamesById, userNamesById })
  } catch (error) {
    console.error("[GET /api/collections/photographer-names]", error)
    return NextResponse.json(
      { error: "Failed to load photographer names" },
      { status: 500 }
    )
  }
}
