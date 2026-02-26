/**
 * Collections service — domain-facing layer for create, read, update, list, publish.
 * Depends on ICollectionsRepository. No UI. No React.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

import type {
  Collection,
  CollectionConfig,
  CurrentOwnerRole,
  CollectionSubstatus,
  ICollectionsRepository,
  ListCollectionsFilters,
} from "@/lib/domain/collections"
import {
  isDraftComplete,
  derivePublishedStatus,
  deriveCanonicalCollectionStatus,
  isValidSubstatusTransition,
  getInitialSubstatus,
  getStepOwner,
} from "@/lib/domain/collections/workflow"
import {
  computeStepStatuses,
  buildEventCreatedAtMap,
  computeStepHealth,
  getDeadlineForStep,
} from "@/lib/domain/collections/step-health"
import {
  configToViewStepsInput,
  getViewStepDefinitions,
  type ViewStepId,
} from "@/lib/domain/collections/view-mode-steps"
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

function mapParticipantRoleToCurrentOwnerRole(
  role: import("@/lib/domain/collections").ParticipantRole
): CurrentOwnerRole {
  switch (role) {
    case "producer":
      return "noba"
    case "client":
      return "client"
    case "photographer":
      return "photographer"
    case "agency":
      return "agency"
    case "photo_lab":
      return "photo_lab"
    case "retouch_studio":
      return "retouch_studio"
    case "handprint_lab":
      return "handprint_lab"
  }
}

export class CollectionsService {
  constructor(
    private readonly repository: ICollectionsRepository,
    private readonly notifications: INotificationsService
  ) {}

  /**
   * Creates a new collection (draft) from modal config.
   * - ownerUserId = logged-in noba producer (stored as role='noba', is_owner=true)
   * - managerUserId = selected CLIENT user (stored as role='client', is_owner=false)
   */
  async createCollection(config: CollectionConfig): Promise<Collection> {
    validateCreateConfig(config)
    const id = generateId()
    const now = new Date().toISOString()
    const participants: import("@/lib/domain/collections").CollectionParticipant[] = []
    // Client participant with selected client user (role='client' in DB)
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
    // Producer participant with owner (role='noba', is_owner=true in DB)
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
    const collection = await this.repository.getById(id)
    if (!collection) return null
    const canonical = deriveCanonicalCollectionStatus(
      collection.config,
      collection.publishedAt,
      collection.status,
      new Date()
    )
    if (canonical !== collection.status) {
      const updated = await this.repository.update(id, {
        status: canonical,
        ...(canonical === "in_progress"
          ? { substatus: getInitialSubstatus() }
          : { substatus: null }),
      })
      const result = updated ?? { ...collection, status: canonical }
      if (canonical === "in_progress") {
        try {
          await this.notifications.triggerEvent(id, "shooting_started", undefined, undefined)
        } catch (err) {
          console.warn("[CollectionsService] shooting_started event after status sync failed:", err)
        }
      }
      return result
    }
    return collection
  }

  async updateCollection(
    id: string,
    patch: import("@/lib/domain/collections").CollectionUpdatePatch
  ): Promise<Collection | null> {
    const wasAlreadyInProgress =
      patch.status === "in_progress"
        ? (await this.repository.getById(id))?.status === "in_progress"
        : false
    const updated = await this.repository.update(id, patch)
    if (
      updated &&
      patch.status === "in_progress" &&
      !wasAlreadyInProgress
    ) {
      try {
        await this.notifications.triggerEvent(id, "shooting_started", undefined, undefined)
      } catch (err) {
        console.warn("[CollectionsService] shooting_started event after update failed:", err)
      }
    }
    return updated
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
    const list = await this.repository.list(filters)
    const now = new Date()
    const result: Collection[] = []
    for (const c of list) {
      const canonical = deriveCanonicalCollectionStatus(
        c.config,
        c.publishedAt,
        c.status,
        now
      )
      if (canonical !== c.status) {
        const updated = await this.repository.update(c.id, {
          status: canonical,
          ...(canonical === "in_progress"
            ? { substatus: getInitialSubstatus() }
            : { substatus: null }),
        })
        result.push(updated ?? { ...c, status: canonical })
        if (canonical === "in_progress") {
          try {
            await this.notifications.triggerEvent(c.id, "shooting_started", undefined, undefined)
          } catch (err) {
            console.warn("[CollectionsService] shooting_started event after list sync failed:", err)
          }
        }
      } else {
        result.push(c)
      }
    }
    return result
  }

  /**
   * Publishes a collection draft (status → upcoming or in_progress).
   * Validates draft is complete. Sets publishedAt.
   * When status becomes in_progress, records a shooting_started event.
   */
  async publishCollection(
    id: string,
    now: Date = new Date(),
    triggeredByUserId?: string
  ): Promise<Collection> {
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
      ...(newStatus === "in_progress" ? { substatus: "shooting" as const } : {}),
    })

    if (!updated) {
      throw new CollectionsServiceError("Failed to update collection status", "UPDATE_FAILED")
    }

    // When status is in_progress, record shooting_started so workflow events stay in sync
    if (newStatus === "in_progress") {
      try {
        await this.notifications.triggerEvent(id, "shooting_started", triggeredByUserId ?? undefined, undefined)
      } catch (err) {
        console.warn("[CollectionsService] shooting_started event after publish failed (collection was published):", err)
      }
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

  /**
   * Updates substatus for a collection with status = in_progress.
   * When newSubstatus is 'client_confirmation', also sets status to 'completed' and substatus to null.
   * Validates that the transition is allowed (next in sequence or initial).
   */
  async updateSubstatus(
    collectionId: string,
    newSubstatus: CollectionSubstatus
  ): Promise<Collection> {
    const collection = await this.repository.getById(collectionId)
    if (!collection) {
      throw new CollectionsServiceError("Collection not found", "NOT_FOUND")
    }
    if (collection.status !== "in_progress") {
      throw new CollectionsServiceError(
        "Substatus can only be updated when collection status is in_progress",
        "INVALID_STATUS"
      )
    }
    const currentSubstatus = collection.substatus ?? null
    // If already at the target substatus, treat as no-op (idempotent)
    if (currentSubstatus === newSubstatus) {
      return collection
    }
    if (!isValidSubstatusTransition(currentSubstatus, newSubstatus)) {
      throw new CollectionsServiceError(
        "Invalid substatus transition",
        "INVALID_TRANSITION"
      )
    }
    if (newSubstatus === "client_confirmation") {
      const updated = await this.repository.update(collectionId, {
        status: "completed",
        substatus: null,
      })
      if (!updated) {
        throw new CollectionsServiceError(
          "Failed to complete collection",
          "UPDATE_FAILED"
        )
      }
      return updated
    }
    const updated = await this.repository.update(collectionId, {
      substatus: newSubstatus,
    })
    if (!updated) {
      throw new CollectionsServiceError(
        "Failed to update substatus",
        "UPDATE_FAILED"
      )
    }
    return updated
  }

  /**
   * Reverts substatus backwards (e.g. missing photos flow).
   * Unlike updateSubstatus, this does not validate the transition is forward-only.
   * Only allowed when status = in_progress.
   */
  async revertSubstatus(
    collectionId: string,
    targetSubstatus: CollectionSubstatus
  ): Promise<Collection> {
    const collection = await this.repository.getById(collectionId)
    if (!collection) {
      throw new CollectionsServiceError("Collection not found", "NOT_FOUND")
    }
    if (collection.status !== "in_progress") {
      throw new CollectionsServiceError(
        "Substatus can only be reverted when collection status is in_progress",
        "INVALID_STATUS"
      )
    }
    // If already at the target, no-op
    if (collection.substatus === targetSubstatus) {
      return collection
    }
    const updated = await this.repository.update(collectionId, {
      substatus: targetSubstatus,
    })
    if (!updated) {
      throw new CollectionsServiceError(
        "Failed to revert substatus",
        "UPDATE_FAILED"
      )
    }
    return updated
  }

  /**
   * Completes a collection (e.g. when collection_completed event is triggered).
   * Sets status to 'completed' and substatus to null.
   * Unlike updateSubstatus, this works even if substatus is already client_confirmation
   * (the idempotency guard in updateSubstatus would skip the status change).
   */
  async completeCollection(collectionId: string): Promise<Collection> {
    const collection = await this.repository.getById(collectionId)
    if (!collection) {
      throw new CollectionsServiceError("Collection not found", "NOT_FOUND")
    }
    if (collection.status === "completed") {
      return collection
    }
    if (collection.status !== "in_progress") {
      throw new CollectionsServiceError(
        "Collection can only be completed from in_progress status",
        "INVALID_STATUS"
      )
    }
    const updated = await this.repository.update(collectionId, {
      status: "completed",
      substatus: null,
    })
    if (!updated) {
      throw new CollectionsServiceError(
        "Failed to complete collection",
        "UPDATE_FAILED"
      )
    }
    return updated
  }

  /**
   * Cancels a collection (e.g. when collection_cancelled event is triggered).
   * Sets status to 'canceled' and substatus to null.
   */
  async cancelCollection(collectionId: string): Promise<Collection> {
    const collection = await this.repository.getById(collectionId)
    if (!collection) {
      throw new CollectionsServiceError("Collection not found", "NOT_FOUND")
    }
    if (collection.status === "canceled") {
      return collection
    }
    const updated = await this.repository.update(collectionId, {
      status: "canceled",
      substatus: null,
    })
    if (!updated) {
      throw new CollectionsServiceError(
        "Failed to cancel collection",
        "UPDATE_FAILED"
      )
    }
    return updated
  }

  /**
   * Recomputes and persists step_statuses and completion_percentage for a collection.
   * Called after an event is triggered or substatus is updated.
   *
   * @param collectionId - The collection to update
   * @param events - Array of { event_type, created_at } from collection_events
   * @param now - Current time for health computation
   * @returns The updated collection
   */
  async recomputeAndPersistProgress(
    collectionId: string,
    events: Array<{ event_type: string; created_at: string; metadata?: Record<string, unknown> | null }>,
    now: Date = new Date(),
    triggeringEventType?: string
  ): Promise<Collection | null> {
    const collection = await this.repository.getById(collectionId)
    if (!collection) return null

    const eventTypes = events.map((e) => e.event_type)
    const eventCreatedAtMap = buildEventCreatedAtMap(events)
    const { stepStatuses: computedStepStatuses } = computeStepStatuses(
      collection.config,
      eventTypes,
      eventCreatedAtMap,
      events,
      now
    )

    // For revert events, enforce stage alignment with current substatus so step_statuses
    // always reflects the real active step after moving backwards.
    const stepStatuses = { ...computedStepStatuses }
    const latestEventType = events.length > 0 ? events[events.length - 1]?.event_type : null
    const shouldNormalizeFromSubstatus =
      latestEventType === "photographer_requested_additional_photos" ||
      triggeringEventType === "photographer_requested_additional_photos"
    if (shouldNormalizeFromSubstatus && collection.status === "in_progress" && collection.substatus) {
      const stepDefs = getViewStepDefinitions(configToViewStepsInput(collection.config)).filter(
        (def) => !def.inactive
      )
      const visibleStepIds = stepDefs.map((def) => def.id)
      const SUBSTATUS_TO_STEP_ID: Partial<Record<CollectionSubstatus, ViewStepId>> = {
        shooting: "shooting",
        negatives_drop_off: "negatives_dropoff",
        low_res_scanning: "low_res_scanning",
        photographer_selection: "photographer_selection",
        client_selection: "client_selection",
        low_res_to_high_res: "handprint_high_res",
        edition_request: "edition_request",
        final_edits: "final_edits",
        photographer_last_check: "photographer_last_check",
        client_confirmation: "client_confirmation",
      }
      const activeStepId = SUBSTATUS_TO_STEP_ID[collection.substatus]
      const activeIndex = activeStepId
        ? visibleStepIds.findIndex((id) => id === activeStepId)
        : -1

      if (activeIndex >= 0) {
        for (let idx = 0; idx < visibleStepIds.length; idx++) {
          const stepId = visibleStepIds[idx]
          const deadline = getDeadlineForStep(collection.config, stepId)
          if (idx < activeIndex) {
            const completedAt = eventCreatedAtMap[stepId]
            stepStatuses[stepId] = {
              stage: "done",
              health: computeStepHealth("done", deadline.date, deadline.time, now, completedAt),
            }
          } else if (idx === activeIndex) {
            stepStatuses[stepId] = {
              stage: "in-progress",
              health: computeStepHealth("in-progress", deadline.date, deadline.time, now),
            }
          } else {
            stepStatuses[stepId] = { stage: "upcoming", health: null }
          }
        }
      }
    }

    const doneCount = Object.values(stepStatuses).filter((entry) => entry.stage === "done").length
    const visibleCount = Object.values(stepStatuses).length
    const completionPercentage = visibleCount > 0 ? Math.round((doneCount / visibleCount) * 100) : 0

    // Keep substatus aligned with the currently active in-progress step.
    // This is especially important after revert events.
    const activeStepId = Object.entries(stepStatuses).find(
      ([, entry]) => entry.stage === "in-progress"
    )?.[0] as ViewStepId | undefined
    const STEP_ID_TO_SUBSTATUS: Partial<Record<ViewStepId, CollectionSubstatus>> = {
      shooting: "shooting",
      negatives_dropoff: "negatives_drop_off",
      low_res_scanning: "low_res_scanning",
      photographer_selection: "photographer_selection",
      client_selection: "client_selection",
      photographer_check_client_selection: "client_selection",
      handprint_high_res: "low_res_to_high_res",
      edition_request: "edition_request",
      final_edits: "final_edits",
      photographer_last_check: "photographer_last_check",
      client_confirmation: "client_confirmation",
    }
    const syncedSubstatus = activeStepId ? STEP_ID_TO_SUBSTATUS[activeStepId] : undefined
    const currentOwners: CurrentOwnerRole[] = activeStepId
      ? Array.from(
          new Set(
            getStepOwner(activeStepId as import("@/lib/domain/collections").StepId, collection).map(
              mapParticipantRoleToCurrentOwnerRole
            )
          )
        )
      : []

    const updated = await this.repository.update(collectionId, {
      stepStatuses,
      completionPercentage,
      currentOwners,
      ...(collection.status === "in_progress" && syncedSubstatus
        ? { substatus: syncedSubstatus }
        : {}),
    })
    return updated
  }
}
