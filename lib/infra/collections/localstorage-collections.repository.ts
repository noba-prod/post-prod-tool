/**
 * LocalStorage implementation of ICollectionsRepository.
 * Client-only: use only when typeof window !== "undefined".
 * Single key "noba_collections_v1"; array of Collection serialized as JSON.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type {
  Collection,
  CollectionUpdatePatch,
  ICollectionsRepository,
  ListCollectionsFilters,
} from "@/lib/domain/collections"

const STORAGE_KEY = "noba_collections_v1"

function readAll(): Collection[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: Collection[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export class LocalStorageCollectionsRepository implements ICollectionsRepository {
  async create(collection: Collection): Promise<Collection> {
    const id = collection.id?.trim() || generateId()
    const now = new Date().toISOString()
    const created: Collection = {
      ...collection,
      id,
      status: collection.status ?? "draft",
      updatedAt: now,
    }
    const items = readAll()
    if (items.some((c) => c.id === id)) {
      const next = items.map((c) => (c.id === id ? created : c))
      writeAll(next)
    } else {
      writeAll([...items, created])
    }
    return created
  }

  async getById(id: string): Promise<Collection | null> {
    const items = readAll()
    return items.find((c) => c.id === id) ?? null
  }

  async update(id: string, patch: CollectionUpdatePatch): Promise<Collection | null> {
    const items = readAll()
    const index = items.findIndex((c) => c.id === id)
    if (index === -1) return null
    const current = items[index]
    const updated: Collection = {
      ...current,
      ...patch,
      id: current.id,
      config: patch.config !== undefined ? { ...current.config, ...patch.config } : current.config,
      participants: patch.participants !== undefined ? patch.participants : current.participants,
      creationData:
        patch.creationData !== undefined ? patch.creationData : current.creationData,
      updatedAt: new Date().toISOString(),
    }
    const next = [...items]
    next[index] = updated
    writeAll(next)
    return updated
  }

  async list(filters?: ListCollectionsFilters): Promise<Collection[]> {
    let items = readAll()
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
