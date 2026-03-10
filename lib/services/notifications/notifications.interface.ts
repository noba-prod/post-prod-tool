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
  // Photographer review (validates client selection — step 6)
  | "photographer_check_approved"
  | "photographer_check_deadline_missed"
  // Photographer review events (last check — step 10)
  | "photographer_review_started"
  | "photographer_edits_approved"
  | "photographer_review_deadline_missed"
  // Client confirmation (step 11)
  | "client_confirmation_confirmed"
  // Comment events
  | "comment_added"
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
  status: "pending" | "sent" | "read" | "failed"
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
    metadata?: Record<string, unknown>
  ): Promise<void>

  /**
   * Process all pending scheduled notifications.
   * Called by the cron job.
   */
  processScheduledNotifications(): Promise<{ processed: number; errors: number }>

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
   * Detect missed deadlines in active collections and fire *_deadline_missed events.
   */
  detectAndFireMissedDeadlines(): Promise<{ fired: number }>

  /**
   * Re-schedule time-based notifications for recently updated collections.
   */
  rescheduleForUpdatedCollections(): Promise<{ rescheduled: number }>

  /**
   * Handle a new comment being added to a step.
   * Notifies all relevant parties for the step except the commenter.
   */
  handleCommentAdded(
    collectionId: string,
    stepNoteKey: string,
    commentUserId: string,
    commentText: string
  ): Promise<void>
}
