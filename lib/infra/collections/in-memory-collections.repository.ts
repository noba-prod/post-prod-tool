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

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
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
    const updated: Collection = {
      ...current,
      ...patch,
      id: current.id,
      config: patch.config !== undefined ? { ...current.config, ...patch.config } : current.config,
      participants: patch.participants !== undefined ? patch.participants : current.participants,
      creationData:
        patch.creationData !== undefined ? patch.creationData : current.creationData,
      substatus,
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
