import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { shootingTypeFromDbFlags } from "@/lib/domain/collections"
import type { CollectionShootingType } from "@/lib/domain/collections"

type CatalogDbRow = {
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
  photographerId: string | null
  shootingType: CollectionShootingType
}

type PlayerNameRow = { id: string; name: string }
type ProfileRow = { is_internal: boolean | null }

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
        "client_id, status, reference, photographer_id, low_res_to_high_res_hand_print, handprint_variant"
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
    const rows: FilterCatalogRow[] = dbRows.map((row) => ({
      clientId: row.client_id,
      status: row.status,
      reference: row.reference?.trim() ? row.reference.trim() : null,
      photographerId: row.photographer_id,
      shootingType: shootingTypeFromDbFlags(
        row.low_res_to_high_res_hand_print,
        row.handprint_variant
      ),
    }))

    const clientIds = [...new Set(rows.map((row) => row.clientId).filter((id): id is string => Boolean(id)))]
    const photographerIds = [
      ...new Set(rows.map((row) => row.photographerId).filter((id): id is string => Boolean(id))),
    ]

    const admin = createAdminClient()
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
