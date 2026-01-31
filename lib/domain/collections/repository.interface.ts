/**
 * Collections repository interface.
 * Abstraction only — no persistence implementation.
 * Future adapters (in-memory, localStorage, Supabase, etc.) will implement this.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type { Collection, CollectionStatus } from "./types"

export interface ListCollectionsFilters {
  status?: CollectionStatus
  clientEntityId?: string
  createdByUserId?: string
}

/** Patch for update: top-level fields optional; config is merged (partial). */
export type CollectionUpdatePatch = Partial<Omit<Collection, "id" | "config">> & {
  config?: Partial<Collection["config"]>
}

/**
 * Repository for Collections (draft + published).
 * No side effects beyond persistence; no business rules.
 */
export interface ICollectionsRepository {
  create(collection: Collection): Promise<Collection>

  getById(id: string): Promise<Collection | null>

  update(id: string, patch: CollectionUpdatePatch): Promise<Collection | null>

  delete(id: string): Promise<void>

  list(filters?: ListCollectionsFilters): Promise<Collection[]>
}
