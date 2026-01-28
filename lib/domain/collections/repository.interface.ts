/**
 * Collections repository interface.
 * Abstraction only — no persistence implementation.
 * Future adapters (in-memory, localStorage, Supabase, etc.) will implement this.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type { CollectionConfig, CollectionDraft } from "./types"

/**
 * Partial update for a draft. Only provided fields are updated.
 */
export type CollectionDraftPatch = Partial<
  Omit<CollectionDraft, "id" | "status" | "config" | "updatedAt">
> & {
  config?: Partial<CollectionDraft["config"]>
}

/**
 * Repository for Collection drafts.
 * No side effects beyond persistence; no business rules.
 */
export interface ICollectionsRepository {
  /**
   * Creates a new draft from modal config.
   * Returns the draft with a generated id, status "draft", empty participants and creationData.
   */
  createDraft(config: CollectionConfig): Promise<CollectionDraft>

  /**
   * Retrieves a draft by id.
   * @returns The draft if found, null otherwise
   */
  getDraftById(id: string): Promise<CollectionDraft | null>

  /**
   * Updates an existing draft with a partial payload.
   * @returns The updated draft, or null if not found
   */
  updateDraft(
    id: string,
    patch: CollectionDraftPatch
  ): Promise<CollectionDraft | null>
}
