import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { shootingTypeFromDbFlags } from "@/lib/domain/collections"
import type { CollectionShootingType } from "@/lib/domain/collections"

type CatalogDbRow = {
  id: string
  client_id: string | null
  status: string
  reference: string | null
  photographer_id: string | null
  low_res_to_high_res_hand_print: boolean | null
  handprint_variant: string | null
}

export type FilterCatalogRow = {
  clientId: string | null
  status: string
  reference: string | null
  photographerIds: string[]
  shootingType: CollectionShootingType
}

type PlayerNameRow = { id: string; name: string }
type ProfileRow = { is_internal: boolean | null }
type PhotographerMemberRow = { collection_id: string; user_id: string }
type ProfilePlayerRow = { id: string; player_id: string | null }

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_internal")
      .eq("id", user.id)
      .maybeSingle()

    const isInternal = Boolean((profile as ProfileRow | null)?.is_internal)

    let collectionsQuery = supabase
      .from("collections")
      .select(
        "id, client_id, status, reference, photographer_id, low_res_to_high_res_hand_print, handprint_variant"
      )

    if (!isInternal) {
      collectionsQuery = collectionsQuery.neq("status", "draft")
    }

    const { data: visibleCollections, error: collectionsError } = await collectionsQuery

    if (collectionsError) {
      return NextResponse.json(
        { error: "Failed to load filter catalog" },
        { status: 500 }
      )
    }

    const dbRows = (visibleCollections ?? []) as unknown as CatalogDbRow[]
    const collectionIds = dbRows.map((row) => row.id)
    const photographerIdsByCollection = new Map<string, Set<string>>()

    for (const row of dbRows) {
      const ids = new Set<string>()
      if (row.photographer_id) ids.add(row.photographer_id)
      photographerIdsByCollection.set(row.id, ids)
    }

    const admin = createAdminClient()

    if (collectionIds.length > 0) {
      const { data: members, error: membersError } = await admin
        .from("collection_members")
        .select("collection_id, user_id")
        .in("collection_id", collectionIds)
        .in("role", ["photographer", "agency"])

      if (membersError) {
        return NextResponse.json(
          { error: "Failed to load photographer members" },
          { status: 500 }
        )
      }

      const memberRows = (members ?? []) as unknown as PhotographerMemberRow[]
      const userIds = [...new Set(memberRows.map((member) => member.user_id))]

      const playerIdByUserId = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await admin
          .from("profiles")
          .select("id, player_id")
          .in("id", userIds)

        if (profilesError) {
          return NextResponse.json(
            { error: "Failed to load photographer profiles" },
            { status: 500 }
          )
        }

        for (const profileRow of (profiles ?? []) as unknown as ProfilePlayerRow[]) {
          if (profileRow.player_id) {
            playerIdByUserId.set(profileRow.id, profileRow.player_id)
          }
        }
      }

      for (const member of memberRows) {
        const playerId = playerIdByUserId.get(member.user_id)
        if (!playerId) continue
        const ids = photographerIdsByCollection.get(member.collection_id)
        if (ids) ids.add(playerId)
      }
    }

    const rows: FilterCatalogRow[] = dbRows.map((row) => ({
      clientId: row.client_id,
      status: row.status,
      reference: row.reference?.trim() ? row.reference.trim() : null,
      photographerIds: [...(photographerIdsByCollection.get(row.id) ?? [])],
      shootingType: shootingTypeFromDbFlags(
        row.low_res_to_high_res_hand_print,
        row.handprint_variant
      ),
    }))

    const clientIds = [...new Set(rows.map((row) => row.clientId).filter((id): id is string => Boolean(id)))]
    const photographerIds = [
      ...new Set(rows.flatMap((row) => row.photographerIds)),
    ]

    const clientNamesById: Record<string, string> = {}
    const photographerNamesById: Record<string, string> = {}

    const nameIds = [...new Set([...clientIds, ...photographerIds])]
    if (nameIds.length > 0) {
      const { data: players, error: playersError } = await admin
        .from("players")
        .select("id, name")
        .in("id", nameIds)

      if (playersError) {
        return NextResponse.json(
          { error: "Failed to load filter names" },
          { status: 500 }
        )
      }

      const clientIdSet = new Set(clientIds)
      const photographerIdSet = new Set(photographerIds)
      for (const player of (players ?? []) as unknown as PlayerNameRow[]) {
        if (!player.id || !player.name) continue
        if (clientIdSet.has(player.id)) clientNamesById[player.id] = player.name
        if (photographerIdSet.has(player.id)) photographerNamesById[player.id] = player.name
      }
    }

    return NextResponse.json({
      rows,
      clientNamesById,
      photographerNamesById,
    })
  } catch (error) {
    console.error("[GET /api/collections/filter-catalog]", error)
    return NextResponse.json(
      { error: "Failed to load filter catalog" },
      { status: 500 }
    )
  }
}
