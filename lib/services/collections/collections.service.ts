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
import { isDraftComplete, derivePublishedStatus } from "@/lib/domain/collections/workflow"
import type { INotificationsService } from "../notifications/notifications.interface"

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
  constructor(
    private readonly repository: ICollectionsRepository,
    private readonly notifications: INotificationsService
  ) {}

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

  async listDrafts(): Promise<CollectionDraft[]> {
    return this.repository.listDrafts()
  }

  /**
   * Publishes a collection draft (changes status from "draft" to "upcoming" or "in_progress").
   * Validates draft is complete before publishing.
   * @param id Draft ID
   * @param now Current date/time (defaults to new Date())
   * @returns Updated draft with new status
   * @throws CollectionsServiceError with code "NOT_FOUND" if draft doesn't exist
   * @throws CollectionsServiceError with code "DRAFT_INCOMPLETE" if draft is not complete
   */
  async publishCollection(id: string, now: Date = new Date()): Promise<CollectionDraft> {
    const draft = await this.repository.getDraftById(id)
    if (!draft) {
      throw new CollectionsServiceError("Draft not found", "NOT_FOUND")
    }

    if (!isDraftComplete(draft)) {
      throw new CollectionsServiceError("Finish required setup before publishing", "DRAFT_INCOMPLETE")
    }

    const newStatus = derivePublishedStatus(draft.config, now)
    const updated = await this.repository.updateDraft(id, { status: newStatus })

    if (!updated) {
      throw new CollectionsServiceError("Failed to update draft status", "UPDATE_FAILED")
    }

    // Prepare notification payload (participant user IDs from draft.participants)
    const participantUserIds: string[] = []
    const participantEntityIds: string[] = []
    for (const participant of draft.participants) {
      if (participant.entityId) {
        participantEntityIds.push(participant.entityId)
      }
      if (participant.userIds) {
        participantUserIds.push(...participant.userIds)
      }
    }

    // Enqueue notification (no-op for now, but seam is ready)
    await this.notifications.collectionPublished({
      collectionId: id,
      participantUserIds,
      participantEntityIds,
    })

    return updated
  }
}
