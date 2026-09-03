/**
 * Supabase implementation of ICollectionsRepository.
 * Uses collections + collection_members tables; RLS applies.
 * When supabase client is passed (e.g. admin client on server), uses it; otherwise uses browser client.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  Collection,
  CollectionUpdatePatch,
  ICollectionsRepository,
  ListCollectionsFilters,
  ListCollectionsPageOptions,
  ListCollectionsPageResult,
} from "@/lib/domain/collections"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import type { Collection as DbCollection, CollectionMember } from "@/lib/supabase/database.types"
import {
  mapDbCollectionToDomain,
  mapDomainToDbInsert,
  mapDomainPatchToDbUpdate,
  mapParticipantsToDbMembers,
} from "@/lib/utils/collection-mappers"
import type { CollectionShootingType } from "@/lib/domain/collections"
import { fetchCollectionIdsForPhotographerEntity } from "@/lib/infra/collections/photographer-co-owner"

/** Card/list columns only — skip large JSONB note/URL payloads. */
const LIST_PAGE_COLUMNS = [
  "id",
  "name",
  "reference",
  "status",
  "substatus",
  "client_id",
  "photographer_id",
  "photo_lab_id",
  "retouch_studio_id",
  "handprint_lab_id",
  "shooting_start_date",
  "shooting_start_time",
  "shooting_end_date",
  "shooting_end_time",
  "shooting_city",
  "shooting_country",
  "project_deadline",
  "project_deadline_time",
  "updated_at",
  "published_at",
  "step_statuses",
  "completion_percentage",
  "low_res_to_high_res_hand_print",
  "handprint_variant",
  "photographer_collaborates_with_agency",
  "low_res_to_high_res_digital",
  "photographer_request_edition",
  "handprint_different_from_original_lab",
  "noba_user_ids",
].join(", ")

export class SupabaseCollectionsRepository implements ICollectionsRepository {
  constructor(private readonly supabaseClient?: SupabaseClient<Database>) {}

  private get supabase() {
    return this.supabaseClient ?? createClient()
  }

  async create(collection: Collection): Promise<Collection> {
    const supabase = this.supabase
    const insert = mapDomainToDbInsert(collection)
    const ownerUserId = collection.config.ownerUserId
    const members = mapParticipantsToDbMembers(collection.id, collection.participants, ownerUserId)

    const tbl = supabase.from("collections") as ReturnType<typeof supabase.from>
    const { data: row, error: insertError } = await tbl.insert(insert).select().single()
    if (insertError) {
      const msg =
        (insertError as { message?: string }).message ??
        (insertError as { error_description?: string }).error_description ??
        JSON.stringify(insertError)
      console.error("[SupabaseCollectionsRepository] create insert error:", msg, insertError)
      throw new Error(msg)
    }

    if (members.length > 0) {
      const memTbl = supabase.from("collection_members") as ReturnType<typeof supabase.from>
      const { error: memError } = await memTbl.insert(members)
      if (memError) {
        console.error("[SupabaseCollectionsRepository] create members error:", memError)
      }
    }

    const dbRow = row as DbCollection
    return mapDbCollectionToDomain(dbRow, await this.fetchMembers(collection.id))
  }

  async getById(id: string): Promise<Collection | null> {
    const supabase = this.supabase
    const tbl = supabase.from("collections") as ReturnType<typeof supabase.from>
    const { data: row, error } = await tbl.select("*").eq("id", id).single()
    if (error || !row) return null
    const members = await this.fetchMembers(id)
    return mapDbCollectionToDomain(row as DbCollection, members)
  }

  async update(id: string, patch: CollectionUpdatePatch): Promise<Collection | null> {
    const supabase = this.supabase
    const current = await this.getById(id)
    if (!current) return null

    const existingPhotoLabId =
      patch.participants?.find((p) => p.role === "photo_lab")?.entityId ??
      current.participants.find((p) => p.role === "photo_lab")?.entityId ??
      null

    const updatePayload = mapDomainPatchToDbUpdate(
      {
      config: patch.config,
      participants: patch.participants,
      status: patch.status,
      publishedAt: patch.publishedAt,
      substatus: patch.substatus,
      stepStatuses: patch.stepStatuses,
      completionPercentage: patch.completionPercentage,
      // URL arrays
      lowResSelectionUrl: patch.lowResSelectionUrl,
      lowResSelectionUploadedAt: patch.lowResSelectionUploadedAt,
      photographerSelectionUrl: patch.photographerSelectionUrl,
      photographerSelectionUploadedAt: patch.photographerSelectionUploadedAt,
      clientSelectionUrl: patch.clientSelectionUrl,
      clientSelectionUploadedAt: patch.clientSelectionUploadedAt,
      highResSelectionUrl: patch.highResSelectionUrl,
      highResSelectionUploadedAt: patch.highResSelectionUploadedAt,
      editionInstructionsUrl: patch.editionInstructionsUrl,
      editionInstructionsUploadedAt: patch.editionInstructionsUploadedAt,
      finalsSelectionUrl: patch.finalsSelectionUrl,
      finalsSelectionUploadedAt: patch.finalsSelectionUploadedAt,
      photographerLastCheckUrl: patch.photographerLastCheckUrl,
      photographerLastCheckUploadedAt: patch.photographerLastCheckUploadedAt,
      photographerApprovedMaterialUrls: patch.photographerApprovedMaterialUrls,
      // Step notes conversations
      stepNotesLowRes: patch.stepNotesLowRes,
      stepNotesPhotographerSelection: patch.stepNotesPhotographerSelection,
      stepNotesClientSelection: patch.stepNotesClientSelection,
      stepNotesHighRes: patch.stepNotesHighRes,
      stepNotesEditionRequest: patch.stepNotesEditionRequest,
      stepNotesFinalEdits: patch.stepNotesFinalEdits,
      stepNotesPhotographerLastCheck: patch.stepNotesPhotographerLastCheck,
      stepNotesClientConfirmation: patch.stepNotesClientConfirmation,
      },
      {
        existingPhotoLabId,
        existingHandprintIsDifferentLab: current.config.handprintIsDifferentLab,
      }
    )
    if (Object.keys(updatePayload).length > 0) {
      ;(updatePayload as Record<string, unknown>).updated_at = new Date().toISOString()
    }
    const tbl = supabase.from("collections") as ReturnType<typeof supabase.from>
    const { data: row, error } = await tbl.update(updatePayload).eq("id", id).select().single()
    if (error || !row) {
      if (error) {
        const msg = (error as { message?: string }).message ?? JSON.stringify(error)
        console.error("[SupabaseCollectionsRepository] update error:", msg, error)
      }
      // Update may have succeeded but select failed (e.g. RLS). Refetch to avoid false failure.
      const fallback = await this.getById(id)
      if (fallback) return fallback
      return null
    }

    if (patch.participants !== undefined) {
      const memTbl = supabase.from("collection_members") as ReturnType<typeof supabase.from>
      const { error: deleteError } = await memTbl.delete().eq("collection_id", id)
      if (deleteError) {
        console.error("[SupabaseCollectionsRepository] Failed to delete members:", deleteError)
      }
      const ownerUserId = patch.config?.ownerUserId ?? current?.config?.ownerUserId
      const members = mapParticipantsToDbMembers(id, patch.participants, ownerUserId)
      if (members.length > 0) {
        const { error: insertError } = await memTbl.insert(members)
        if (insertError) {
          console.error("[SupabaseCollectionsRepository] Failed to insert members:", insertError)
        }
      }
    }

    return mapDbCollectionToDomain(row as DbCollection, await this.fetchMembers(id))
  }

  async delete(id: string): Promise<void> {
    const supabase = this.supabase
    const memTbl = supabase.from("collection_members") as ReturnType<typeof supabase.from>
    await memTbl.delete().eq("collection_id", id)
    const tbl = supabase.from("collections") as ReturnType<typeof supabase.from>
    const { error } = await tbl.delete().eq("id", id)
    if (error) {
      console.error("[SupabaseCollectionsRepository] delete error:", error)
      throw error
    }
  }

  async list(filters?: ListCollectionsFilters): Promise<Collection[]> {
    const { items } = await this.listPage({
      ...filters,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    })
    return items
  }

  async listPage(options: ListCollectionsPageOptions): Promise<ListCollectionsPageResult> {
    const supabase = this.supabase
    const { limit, offset, sortOrder = "desc", ...filters } = options

    let idsToFilter: string[] | null = null
    if (filters.createdByUserId) {
      const { data: memberRows } = await (supabase
        .from("collection_members") as ReturnType<typeof supabase.from>)
        .select("collection_id")
        .eq("user_id", filters.createdByUserId)
      const ids = (memberRows ?? []).map((r: { collection_id: string }) => r.collection_id)
      if (ids.length === 0) return { items: [], hasMore: false }
      idsToFilter = ids
    }

    if (filters.photographerUserId) {
      const { data: memberRows } = await (supabase
        .from("collection_members") as ReturnType<typeof supabase.from>)
        .select("collection_id")
        .eq("user_id", filters.photographerUserId)
        .in("role", ["photographer", "agency"])
      const ids = (memberRows ?? []).map((r: { collection_id: string }) => r.collection_id)
      if (ids.length === 0) return { items: [], hasMore: false }
      idsToFilter = idsToFilter
        ? idsToFilter.filter((id) => ids.includes(id))
        : ids
    }

    if (filters.photographerEntityId) {
      const photographerCollectionIds = await fetchCollectionIdsForPhotographerEntity(
        supabase,
        filters.photographerEntityId
      )
      if (photographerCollectionIds.length === 0) return { items: [], hasMore: false }
      idsToFilter = idsToFilter
        ? idsToFilter.filter((id) => photographerCollectionIds.includes(id))
        : photographerCollectionIds
      if (idsToFilter.length === 0) return { items: [], hasMore: false }
    }

    let query = (supabase.from("collections") as ReturnType<typeof supabase.from>)
      .select(LIST_PAGE_COLUMNS)
      .order("updated_at", { ascending: sortOrder === "asc" })

    if (filters.clientEntityId) {
      query = query.eq("client_id", filters.clientEntityId)
    }
    if (filters.jobReference) {
      query = query.eq("reference", filters.jobReference)
    }
    if (filters.status) {
      query = query.eq("status", filters.status)
    }
    if (filters.excludeDrafts) {
      query = query.neq("status", "draft")
    }
    if (filters.collectionType) {
      query = applyShootingTypeFilter(query, filters.collectionType)
    }
    if (idsToFilter) {
      query = query.in("id", idsToFilter)
    }

    const from = offset
    const to = offset + limit
    query = query.range(from, to)

    const { data: rows, error } = await query
    if (error) {
      const msg =
        (error as { message?: string }).message ??
        (error as { code?: string }).code ??
        JSON.stringify(error)
      console.error("[SupabaseCollectionsRepository] listPage error:", msg, error)
      return { items: [], hasMore: false }
    }

    const list = (rows ?? []) as DbCollection[]
    const hasMore = list.length > limit
    const pageRows = hasMore ? list.slice(0, limit) : list

    const membersByCollectionId = await this.fetchMembersBatch(pageRows.map((r) => r.id))
    const result: Collection[] = pageRows.map((row) =>
      mapDbCollectionToDomain(row, membersByCollectionId.get(row.id) ?? [])
    )

    return { items: result, hasMore }
  }

  private async fetchMembersBatch(collectionIds: string[]): Promise<Map<string, CollectionMember[]>> {
    if (collectionIds.length === 0) return new Map()
    const supabase = this.supabase
    const tbl = supabase.from("collection_members") as ReturnType<typeof supabase.from>
    const { data, error } = await tbl.select("*").in("collection_id", collectionIds)
    if (error) return new Map()
    const map = new Map<string, CollectionMember[]>()
    for (const row of (data ?? []) as CollectionMember[]) {
      const list = map.get(row.collection_id) ?? []
      list.push(row)
      map.set(row.collection_id, list)
    }
    return map
  }

  private async fetchMembers(collectionId: string): Promise<CollectionMember[]> {
    const supabase = this.supabase
    const tbl = supabase.from("collection_members") as ReturnType<typeof supabase.from>
    const { data, error } = await tbl.select("*").eq("collection_id", collectionId)
    if (error) return []
    return (data ?? []) as CollectionMember[]
  }
}

function applyShootingTypeFilter<
  T extends {
    eq: (column: string, value: unknown) => T
    or: (filters: string) => T
  },
>(query: T, type: CollectionShootingType): T {
  if (type === "digital") {
    return query.eq("low_res_to_high_res_hand_print", false)
  }
  if (type === "handprint_hr") {
    return query.eq("low_res_to_high_res_hand_print", true).eq("handprint_variant", "hr")
  }
  return query
    .eq("low_res_to_high_res_hand_print", true)
    .or("handprint_variant.eq.hp,handprint_variant.is.null")
}
