/**
 * Notifications service interface.
 * Abstraction for sending notifications (email, in-app) when collection events occur.
 */

import type { RecipientType } from "./notification-templates"

// Collection event types that can trigger notifications
export type CollectionEventType =
  // Shooting events
  | "shooting_started"
  | "shooting_ended"
  | "negatives_pickup_marked"
  | "shooting_completed_confirmed"
  // Drop-off events
  | "dropoff_confirmed"
  | "dropoff_deadline_missed"
  // Scanning events
  | "scanning_started"
  | "scanning_completed"
  | "scanning_deadline_missed"
  | "lab_shared_additional_materials"
  // Photographer selection events
  | "photographer_selection_uploaded"
  | "photographer_selection_shared"
  | "photographer_selection_deadline_missed"
  | "photographer_requested_additional_photos"
  // Client selection events
  | "client_selection_started"
  | "client_selection_confirmed"
  | "client_selection_shared"
  | "client_selection_deadline_missed"
  // High-res events
  | "highres_started"
  | "highres_ready"
  | "highres_deadline_missed"
  // Edition events
  | "edition_request_submitted"
  | "edition_request_deadline_missed"
  | "final_edits_started"
  | "final_edits_completed"
  | "final_edits_deadline_missed"
  | "retouch_studio_shared_additional_materials"
  // Photographer last check events (step 9)
  | "photographer_edits_approved"
  | "photographer_last_check_shared_additional_materials"
  | "photographer_review_deadline_missed"
  // Client confirmation (step 11)
  | "client_confirmation_confirmed"
  // Comment events
  | "comment_added"
  | "link_edited"
  | "link_deleted"
  // Structural workflow reconfiguration (plan §17). Fired by
  // CollectionsService.applyStructuralWorkflowChange when a producer toggles
  // structural CollectionConfig keys (type of shoot, agency, edition, etc.).
  // Backed by template `workflow_reconfiguration_announcement` (migration 085).
  | "collection_workflow_reconfigured"
  // Final events
  | "collection_completed"
  | "collection_cancelled"

export interface NotificationPayload {
  id: string
  collectionId: string
  templateCode: string
  userId: string
  channel: "email" | "in_app"
  title: string
  body: string
  ctaText: string | null
  ctaUrl: string | null
  status: "pending" | "processing" | "sent" | "read" | "failed"
  scheduledFor: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
}

export interface UserNotification {
  id: string
  title: string
  body: string
  ctaText: string | null
  ctaUrl: string | null
  collectionId: string
  collectionName: string | null
  status: "sent" | "read"
  isRead: boolean
  createdAt: string
  sentAt: string | null
}

export interface INotificationsService {
  /**
   * Called when a collection is published.
   * @param payload Collection publish notification payload
   */
  collectionPublished(payload: {
    collectionId: string
    participantUserIds: string[]
    participantEntityIds?: string[]
  }): Promise<void>

  /**
   * Trigger an event-based notification.
   * Looks up templates with trigger_type='on' matching the event.
   */
  triggerEvent(
    collectionId: string,
    eventType: CollectionEventType,
    triggeredByUserId?: string,
    metadata?: Record<string, unknown>,
    options?: { idempotencyKey?: string }
  ): Promise<void>

  /**
   * Process a bounded batch of pending scheduled notifications + deliveries.
   * Called by the cron job. Respects an optional time budget so each run can
   * finish under the external scheduler timeout; remaining work is left for
   * subsequent runs (rows stay unsent / pending).
   */
  processScheduledNotifications(options?: {
    timeBudgetMs?: number
    startedAt?: number
    maxScheduled?: number
    maxDeliveries?: number
  }): Promise<{
    processed: number
    errors: number
    scheduledProcessed: number
    deliveriesProcessed: number
    remainingScheduled: number
    truncated: boolean
  }>

  /**
   * Schedule time-based notifications for a collection.
   * Scans deadlines and creates scheduled_notification_tracking entries.
   */
  scheduleTimeBasedNotifications(collectionId: string): Promise<void>

  /**
   * Mark a notification as read.
   */
  markAsRead(notificationId: string, userId: string): Promise<void>

  /**
   * Mark in-app notifications as read by collection/step context.
   * Returns the number of notifications marked as read.
   */
  markAsReadByContext(userId: string, collectionId: string, stepId?: string): Promise<number>

  /**
   * Get user's in-app notifications.
   */
  getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<UserNotification[]>

  /**
   * Get count of unread notifications for a user.
   */
  getUnreadCount(userId: string): Promise<number>

  /**
   * Get step IDs in a collection with unread in-app activity for a user.
   */
  getUnreadStepIdsForCollection(userId: string, collectionId: string): Promise<string[]>

  /**
   * Detect missed deadlines in active collections and fire *_deadline_missed events.
   */
  detectAndFireMissedDeadlines(options?: {
    timeBudgetMs?: number
    startedAt?: number
    maxFires?: number
  }): Promise<{ fired: number; truncated: boolean }>

  /**
   * Re-schedule time-based notifications for recently updated collections.
   */
  rescheduleForUpdatedCollections(): Promise<{ rescheduled: number }>

  /**
   * Handle a new comment being added to a step.
   * Notifies everyone who can see the comment thread except the commenter.
   */
  handleCommentAdded(
    collectionId: string,
    stepNoteKey: string,
    commentUserId: string,
    commentText: string,
    options?: CommentNotificationOptions
  ): Promise<void>

  /**
   * Handle a step link being edited or deleted.
   * Notifies everyone who can see the link's thread except the actor.
   */
  handleLinkChanged(
    collectionId: string,
    stepNoteKey: string,
    actorUserId: string,
    action: "edited" | "deleted"
  ): Promise<void>

  /**
   * Sends pending email deliveries now instead of waiting for the next cron run.
   */
  flushPendingDeliveries(): Promise<void>
}

export interface CommentNotificationOptions {
  /** Stage panel where the comment was written (e.g. `client_confirmation`). */
  contextStepId?: string | null
  /** Link the comment is attached to. */
  noteUrl?: string | null
  /** Persisted note timestamp; together with author + thread it identifies the comment for idempotency. */
  noteAt?: string | null
}
