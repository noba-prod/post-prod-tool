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
  ListCollectionsPageOptions,
  ListCollectionsPageResult,
} from "@/lib/domain/collections"
import { generateUuidV4 } from "@/lib/utils/uuid"

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
  return generateUuidV4()
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
    const substatus =
      patch.substatus === null ? undefined : (patch.substatus ?? current.substatus)
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
    const next = [...items]
    next[index] = updated
    writeAll(next)
    return updated
  }

  async delete(id: string): Promise<void> {
    const items = readAll().filter((c) => c.id !== id)
    writeAll(items)
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
    let items = readAll()
    if (options.status) {
      items = items.filter((c) => c.status === options.status)
    }
    if (options.clientEntityId) {
      items = items.filter((c) => c.config.clientEntityId === options.clientEntityId)
    }
    if (options.createdByUserId) {
      items = items.filter((c) => c.config.managerUserId === options.createdByUserId)
    }
    if (options.jobReference) {
      items = items.filter(
        (c) => (c.config.reference?.trim() ?? "") === options.jobReference
      )
    }
    if (options.photographerEntityId) {
      items = items.filter((c) =>
        c.participants.some(
          (p) => p.role === "photographer" && p.entityId === options.photographerEntityId
        )
      )
    }
    if (options.photographerUserId) {
      items = items.filter((c) =>
        c.participants.some(
          (p) =>
            p.role === "photographer" &&
            (p.userIds ?? []).includes(options.photographerUserId!)
        )
      )
    }
    const sortOrder = options.sortOrder ?? "desc"
    items.sort((a, b) => {
      const tA = new Date(a.updatedAt).getTime()
      const tB = new Date(b.updatedAt).getTime()
      return sortOrder === "desc" ? tB - tA : tA - tB
    })
    const page = items.slice(options.offset, options.offset + options.limit)
    return {
      items: page,
      hasMore: options.offset + options.limit < items.length,
    }
  }
}
