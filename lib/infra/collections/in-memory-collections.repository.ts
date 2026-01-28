/**
 * In-memory implementation of ICollectionsRepository.
 * Map-based store. No persistence. For dev/POC until DB is connected.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type {
  CollectionConfig,
  CollectionDraft,
  CollectionDraftPatch,
  ICollectionsRepository,
} from "@/lib/domain/collections"

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

const store = new Map<string, CollectionDraft>()

export class InMemoryCollectionsRepository implements ICollectionsRepository {
  async createDraft(config: CollectionConfig): Promise<CollectionDraft> {
    const id = generateId()
    const now = new Date().toISOString()
    const draft: CollectionDraft = {
      id,
      status: "draft",
      config,
      participants: [],
      creationData: { completedBlockIds: [] },
      updatedAt: now,
    }
    store.set(id, draft)
    return draft
  }

  async getDraftById(id: string): Promise<CollectionDraft | null> {
    return store.get(id) ?? null
  }

  async updateDraft(
    id: string,
    patch: CollectionDraftPatch
  ): Promise<CollectionDraft | null> {
    const current = store.get(id)
    if (!current) return null

    const updated: CollectionDraft = {
      ...current,
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.participants !== undefined && { participants: patch.participants }),
      ...(patch.creationData !== undefined && { creationData: patch.creationData }),
      ...(patch.config !== undefined && {
        config: { ...current.config, ...patch.config },
      }),
      updatedAt: new Date().toISOString(),
    }
    store.set(id, updated)
    return updated
  }

  async listDrafts(): Promise<CollectionDraft[]> {
    const list = Array.from(store.values())
    list.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : b.updatedAt < a.updatedAt ? -1 : 0))
    return list
  }
}
