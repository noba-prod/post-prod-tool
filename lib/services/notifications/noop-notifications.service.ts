/**
 * No-op implementation of INotificationsService.
 * Used during development/testing or when notifications are disabled.
 * All methods are no-ops (do nothing).
 */

import type {
  INotificationsService,
  CollectionEventType,
  CommentNotificationOptions,
  UserNotification,
} from "./notifications.interface"

export class NoopNotificationsService implements INotificationsService {
  async collectionPublished(_payload: {
    collectionId: string
    participantUserIds: string[]
    participantEntityIds?: string[]
  }): Promise<void> {
    // No-op
  }

  async triggerEvent(
    _collectionId: string,
    _eventType: CollectionEventType,
    _triggeredByUserId?: string,
    _metadata?: Record<string, unknown>,
    _options?: { idempotencyKey?: string }
  ): Promise<void> {
    // No-op
  }

  async processScheduledNotifications(_options?: {
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
  }> {
    return {
      processed: 0,
      errors: 0,
      scheduledProcessed: 0,
      deliveriesProcessed: 0,
      remainingScheduled: 0,
      truncated: false,
    }
  }

  async scheduleTimeBasedNotifications(_collectionId: string): Promise<void> {
    // No-op
  }

  async markAsRead(_notificationId: string, _userId: string): Promise<void> {
    // No-op
  }

  async markAsReadByContext(_userId: string, _collectionId: string, _stepId?: string): Promise<number> {
    return 0
  }

  async getUserNotifications(
    _userId: string,
    _options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<UserNotification[]> {
    return []
  }

  async getUnreadCount(_userId: string): Promise<number> {
    return 0
  }

  async getUnreadStepIdsForCollection(_userId: string, _collectionId: string): Promise<string[]> {
    return []
  }

  async detectAndFireMissedDeadlines(_options?: {
    timeBudgetMs?: number
    startedAt?: number
    maxFires?: number
  }): Promise<{ fired: number; truncated: boolean }> {
    return { fired: 0, truncated: false }
  }

  async rescheduleForUpdatedCollections(): Promise<{ rescheduled: number }> {
    return { rescheduled: 0 }
  }

  async handleCommentAdded(
    _collectionId: string,
    _stepNoteKey: string,
    _commentUserId: string,
    _commentText: string,
    _options?: CommentNotificationOptions
  ): Promise<void> {
    // No-op
  }

  async flushPendingDeliveries(): Promise<void> {
    // No-op
  }

  async handleLinkChanged(
    _collectionId: string,
    _stepNoteKey: string,
    _actorUserId: string,
    _action: "edited" | "deleted"
  ): Promise<void> {
    // No-op
  }
}
