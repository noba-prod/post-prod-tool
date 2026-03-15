/**
 * Client-side utility for triggering collection events
 * 
 * Use this in React components or pages to trigger workflow events
 * that will send notifications to relevant users.
 */

import type { CollectionEventType } from "./notifications.interface"

const NOTIFICATIONS_REFRESH_EVENT = "noba:notifications:refresh"

export interface TriggerEventOptions {
  /** Additional metadata to include with the event */
  metadata?: Record<string, unknown>
}

export interface TriggerEventResult {
  success: boolean
  error?: string
}

/**
 * Trigger a collection event from the client side.
 * This will create a collection_events record and send notifications
 * to all relevant recipients based on the event type.
 * 
 * @example
 * ```tsx
 * // In a collection page component
 * const handleScanningComplete = async () => {
 *   const result = await triggerCollectionEvent(
 *     collectionId,
 *     "scanning_completed"
 *   )
 *   if (result.success) {
 *     toast.success("Scanning marked as complete")
 *   }
 * }
 * ```
 */
export async function triggerCollectionEvent(
  collectionId: string,
  eventType: CollectionEventType,
  options?: TriggerEventOptions
): Promise<TriggerEventResult> {
  try {
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const response = await fetch(`/api/collections/${collectionId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        metadata: options?.metadata,
        idempotencyKey,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      return {
        success: false,
        error: data.error || "Failed to trigger event",
      }
    }

    // Ask notification consumers (navbar bell) to refresh immediately.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT))
    }

    return { success: true }
  } catch (error) {
    console.error("[triggerCollectionEvent] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Helper to trigger common workflow events
 */
export const CollectionEvents = {
  // Shooting events
  shootingStarted: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "shooting_started", options),
  
  shootingEnded: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "shooting_ended", options),

  shootingCompletedConfirmed: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "shooting_completed_confirmed", options),
  
  negativesPickupMarked: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "negatives_pickup_marked", options),

  // Drop-off events
  dropoffConfirmed: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "dropoff_confirmed", options),

  // Scanning events
  scanningCompleted: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "scanning_completed", options),

  // Photographer check (validates client selection — step 6)
  photographerCheckApproved: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "photographer_check_approved", options),

  photographerCheckDeadlineMissed: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "photographer_check_deadline_missed", options),

  // Client selection events
  clientSelectionConfirmed: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "client_selection_confirmed", options),

  // High-res events
  highresReady: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "highres_ready", options),

  // Edition events
  editionRequestSubmitted: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "edition_request_submitted", options),
  
  finalEditsCompleted: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "final_edits_completed", options),

  // Photographer review events
  photographerEditsApproved: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "photographer_edits_approved", options),

  // Final events
  collectionCompleted: (collectionId: string, options?: TriggerEventOptions) =>
    triggerCollectionEvent(collectionId, "collection_completed", options),
}
