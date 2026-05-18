/**
 * In-memory implementation of ICollectionsRepository.
 * Map-based store. No persistence. Used for SSR or when window is undefined.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type {
  Collection,
  CollectionUpdatePatch,
  ICollectionsRepository,
  ListCollectionsFilters,
} from "@/lib/domain/collections"
import { generateUuidV4 } from "@/lib/utils/uuid"

function generateId(): string {
  return generateUuidV4()
}

const store = new Map<string, Collection>()

export class InMemoryCollectionsRepository implements ICollectionsRepository {
  async create(collection: Collection): Promise<Collection> {
    const id = (collection.id?.trim() || generateId()) as string
    const now = new Date().toISOString()
    const created: Collection = {
      ...collection,
      id,
      status: collection.status ?? "draft",
      updatedAt: now,
    }
    store.set(id, created)
    return created
  }

  async getById(id: string): Promise<Collection | null> {
    return store.get(id) ?? null
  }

  async update(id: string, patch: CollectionUpdatePatch): Promise<Collection | null> {
    const current = store.get(id)
    if (!current) return null
    const substatus =
      patch.substatus === null ? undefined : (patch.substatus ?? current.substatus)
    // Normalize nullable patch fields (mappers tolerate string|null|undefined on
    // the patch surface but domain Collection only accepts string|undefined).
    const publishedAt =
      patch.publishedAt === null ? undefined : (patch.publishedAt ?? current.publishedAt)
    const normalizeNullableTimestamp = (
      patchValue: string | null | undefined,
      currentValue: string | undefined
    ): string | undefined => (patchValue === null ? undefined : patchValue ?? currentValue)
    const updated: Collection = {
      ...current,
      ...patch,
      id: current.id,
      config: patch.config !== undefined ? { ...current.config, ...patch.config } : current.config,
      participants: patch.participants !== undefined ? patch.participants : current.participants,
      creationData:
        patch.creationData !== undefined ? patch.creationData : current.creationData,
      substatus,
      publishedAt,
      lowResSelectionUploadedAt: normalizeNullableTimestamp(
        patch.lowResSelectionUploadedAt,
        current.lowResSelectionUploadedAt
      ),
      photographerSelectionUploadedAt: normalizeNullableTimestamp(
        patch.photographerSelectionUploadedAt,
        current.photographerSelectionUploadedAt
      ),
      clientSelectionUploadedAt: normalizeNullableTimestamp(
        patch.clientSelectionUploadedAt,
        current.clientSelectionUploadedAt
      ),
      highResSelectionUploadedAt: normalizeNullableTimestamp(
        patch.highResSelectionUploadedAt,
        current.highResSelectionUploadedAt
      ),
      editionInstructionsUploadedAt: normalizeNullableTimestamp(
        patch.editionInstructionsUploadedAt,
        current.editionInstructionsUploadedAt
      ),
      finalsSelectionUploadedAt: normalizeNullableTimestamp(
        patch.finalsSelectionUploadedAt,
        current.finalsSelectionUploadedAt
      ),
      photographerLastCheckUploadedAt: normalizeNullableTimestamp(
        patch.photographerLastCheckUploadedAt,
        current.photographerLastCheckUploadedAt
      ),
      updatedAt: new Date().toISOString(),
    }
    store.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    store.delete(id)
  }

  async list(filters?: ListCollectionsFilters): Promise<Collection[]> {
    let items = Array.from(store.values())
    if (filters?.status) {
      items = items.filter((c) => c.status === filters.status)
    }
    if (filters?.clientEntityId) {
      items = items.filter((c) => c.config.clientEntityId === filters.clientEntityId)
    }
    if (filters?.createdByUserId) {
      items = items.filter((c) => c.config.managerUserId === filters.createdByUserId)
    }
    items.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0))
    return items
  }
}
