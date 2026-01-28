/**
 * Collections service — domain-facing layer for draft creation and retrieval.
 * Depends on ICollectionsRepository. No UI. No React.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type {
  CollectionConfig,
  CollectionDraft,
  CollectionDraftPatch,
  ICollectionsRepository,
} from "@/lib/domain/collections"

export class CollectionsServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = "CollectionsServiceError"
  }
}

function validateCreateDraftConfig(config: Partial<CollectionConfig>): void {
  if (!config.name?.trim()) {
    throw new CollectionsServiceError("Collection name is required", "VALIDATION_ERROR")
  }
  if (!config.clientEntityId?.trim()) {
    throw new CollectionsServiceError("Client is required", "VALIDATION_ERROR")
  }
  if (!config.managerUserId?.trim()) {
    throw new CollectionsServiceError("Manager is required", "VALIDATION_ERROR")
  }
}

export class CollectionsService {
  constructor(private readonly repository: ICollectionsRepository) {}

  async createDraft(config: CollectionConfig): Promise<CollectionDraft> {
    validateCreateDraftConfig(config)
    return this.repository.createDraft(config)
  }

  async getDraftById(id: string): Promise<CollectionDraft | null> {
    return this.repository.getDraftById(id)
  }

  async updateDraft(
    id: string,
    patch: CollectionDraftPatch
  ): Promise<CollectionDraft | null> {
    return this.repository.updateDraft(id, patch)
  }
}
