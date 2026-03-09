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

    const updatePayload = mapDomainPatchToDbUpdate({
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
      photographerReviewUrl: patch.photographerReviewUrl,
      photographerReviewUploadedAt: patch.photographerReviewUploadedAt,
      highResSelectionUrl: patch.highResSelectionUrl,
      highResSelectionUploadedAt: patch.highResSelectionUploadedAt,
      editionInstructionsUrl: patch.editionInstructionsUrl,
      editionInstructionsUploadedAt: patch.editionInstructionsUploadedAt,
      finalsSelectionUrl: patch.finalsSelectionUrl,
      finalsSelectionUploadedAt: patch.finalsSelectionUploadedAt,
      photographerLastCheckUrl: patch.photographerLastCheckUrl,
      photographerLastCheckUploadedAt: patch.photographerLastCheckUploadedAt,
      // Step notes conversations
      stepNotesLowRes: patch.stepNotesLowRes,
      stepNotesPhotographerSelection: patch.stepNotesPhotographerSelection,
      stepNotesClientSelection: patch.stepNotesClientSelection,
      stepNotesPhotographerReview: patch.stepNotesPhotographerReview,
      stepNotesHighRes: patch.stepNotesHighRes,
      stepNotesEditionRequest: patch.stepNotesEditionRequest,
      stepNotesFinalEdits: patch.stepNotesFinalEdits,
      stepNotesPhotographerLastCheck: patch.stepNotesPhotographerLastCheck,
      stepNotesClientConfirmation: patch.stepNotesClientConfirmation,
    })
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
    const supabase = this.supabase
    let idsToFilter: string[] | null = null
    if (filters?.createdByUserId) {
      const { data: memberRows } = await (supabase
        .from("collection_members") as ReturnType<typeof supabase.from>)
        .select("collection_id")
        .eq("user_id", filters.createdByUserId)
      const ids = (memberRows ?? []).map((r: { collection_id: string }) => r.collection_id)
      if (ids.length === 0) return []
      idsToFilter = ids
    }

    let query = (supabase.from("collections") as ReturnType<typeof supabase.from>)
      .select("*")
      .order("updated_at", { ascending: false })
    if (filters?.clientEntityId) {
      query = query.eq("client_id", filters.clientEntityId)
    }
    if (idsToFilter) {
      query = query.in("id", idsToFilter)
    }
    const { data: rows, error } = await query
    if (error) {
      const msg =
        (error as { message?: string }).message ??
        (error as { code?: string }).code ??
        JSON.stringify(error)
      console.error("[SupabaseCollectionsRepository] list error:", msg, error)
      return []
    }
    const list = (rows ?? []) as DbCollection[]
    const result: Collection[] = []
    for (const row of list) {
      const members = await this.fetchMembers(row.id)
      result.push(mapDbCollectionToDomain(row, members))
    }
    if (filters?.status) {
      return result.filter((c) => c.status === filters.status)
    }
    return result
  }

  private async fetchMembers(collectionId: string): Promise<CollectionMember[]> {
    const supabase = this.supabase
    const tbl = supabase.from("collection_members") as ReturnType<typeof supabase.from>
    const { data, error } = await tbl.select("*").eq("collection_id", collectionId)
    if (error) return []
    return (data ?? []) as CollectionMember[]
  }
}
