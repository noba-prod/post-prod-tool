/**
 * Collections service — domain-facing layer for create, read, update, list, publish.
 * Depends on ICollectionsRepository. No UI. No React.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type {
  Collection,
  CollectionConfig,
  ICollectionsRepository,
  ListCollectionsFilters,
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

function validateCreateConfig(config: Partial<CollectionConfig>): void {
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

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export class CollectionsService {
  constructor(
    private readonly repository: ICollectionsRepository,
    private readonly notifications: INotificationsService
  ) {}

  /**
   * Creates a new collection (draft) from modal config.
   * When managerUserId and clientEntityId are set, pre-fills client + producer (manager) so the manager appears in the Client section with edit permission on.
   */
  async createCollection(config: CollectionConfig): Promise<Collection> {
    validateCreateConfig(config)
    const id = generateId()
    const now = new Date().toISOString()
    const participants: import("@/lib/domain/collections").CollectionParticipant[] = []
    if (config.clientEntityId?.trim()) {
      participants.push({ role: "client", entityId: config.clientEntityId })
    }
    if (config.managerUserId?.trim() && config.clientEntityId?.trim()) {
      participants.push({
        role: "producer",
        entityId: config.clientEntityId,
        userIds: [config.managerUserId],
        editPermissionByUserId: { [config.managerUserId]: true },
      })
    }
    const collection: Collection = {
      id,
      status: "draft",
      config,
      participants,
      creationData: { completedBlockIds: [] },
      updatedAt: now,
    }
    return this.repository.create(collection)
  }

  async getCollectionById(id: string): Promise<Collection | null> {
    return this.repository.getById(id)
  }

  async updateCollection(
    id: string,
    patch: import("@/lib/domain/collections").CollectionUpdatePatch
  ): Promise<Collection | null> {
    return this.repository.update(id, patch)
  }

  async deleteCollection(id: string): Promise<void> {
    const collection = await this.repository.getById(id)
    if (!collection) {
      throw new CollectionsServiceError("Collection not found", "NOT_FOUND")
    }
    if (collection.status !== "draft") {
      throw new CollectionsServiceError("Only draft collections can be deleted", "INVALID_STATUS")
    }
    await this.repository.delete(id)
  }

  async listCollections(filters?: ListCollectionsFilters): Promise<Collection[]> {
    return this.repository.list(filters)
  }

  /**
   * Publishes a collection draft (status → upcoming or in_progress).
   * Validates draft is complete. Sets publishedAt.
   */
  async publishCollection(id: string, now: Date = new Date()): Promise<Collection> {
    const collection = await this.repository.getById(id)
    if (!collection) {
      throw new CollectionsServiceError("Collection not found", "NOT_FOUND")
    }

    if (!isDraftComplete(collection)) {
      throw new CollectionsServiceError(
        "Finish required setup before publishing",
        "DRAFT_INCOMPLETE"
      )
    }

    const newStatus = derivePublishedStatus(collection.config, now)
    const nowISO = now.toISOString()
    const updated = await this.repository.update(id, {
      status: newStatus,
      publishedAt: nowISO,
    })

    if (!updated) {
      throw new CollectionsServiceError("Failed to update collection status", "UPDATE_FAILED")
    }

    // TODO: notify participants when notification system is implemented
    // notifyParticipants(collection)

    return updated
  }
}
