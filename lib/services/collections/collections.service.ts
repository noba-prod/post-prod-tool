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
  if (!config.ownerUserId?.trim()) {
    throw new CollectionsServiceError("Owner (noba producer) is required", "VALIDATION_ERROR")
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
   * - ownerUserId = logged-in noba producer (stored as role='producer', is_owner=true)
   * - managerUserId = selected CLIENT manager (stored as role='manager', is_owner=false)
   */
  async createCollection(config: CollectionConfig): Promise<Collection> {
    validateCreateConfig(config)
    const id = generateId()
    const now = new Date().toISOString()
    const participants: import("@/lib/domain/collections").CollectionParticipant[] = []
    // Client participant with selected manager (role='manager' in DB)
    if (config.clientEntityId?.trim()) {
      const clientUserIds = config.managerUserId?.trim() ? [config.managerUserId] : []
      participants.push({
        role: "client",
        entityId: config.clientEntityId,
        userIds: clientUserIds,
        editPermissionByUserId: clientUserIds.length
          ? { [config.managerUserId]: true }
          : {},
      })
    }
    // Producer participant with owner (role='producer', is_owner=true in DB)
    if (config.ownerUserId?.trim()) {
      participants.push({
        role: "producer",
        entityId: undefined,
        userIds: [config.ownerUserId],
        editPermissionByUserId: { [config.ownerUserId]: true },
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

    // Notify participants and schedule time-based notifications (best-effort; don't fail publish)
    const participantUserIds = collection.participants
      .flatMap((p) => p.userIds || [])
      .filter((id) => id?.trim())
    
    const participantEntityIds = collection.participants
      .map((p) => p.entityId)
      .filter((id): id is string => !!id?.trim())

    try {
      await this.notifications.collectionPublished({
        collectionId: id,
        participantUserIds,
        participantEntityIds,
      })
    } catch (err) {
      console.warn("[CollectionsService] Notifications after publish failed (collection was published):", err)
    }

    return updated
  }
}
