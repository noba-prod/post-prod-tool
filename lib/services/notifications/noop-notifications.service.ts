/**
 * No-op implementation of INotificationsService.
 * Used during development/testing or when notifications are disabled.
 * All methods are no-ops (do nothing).
 */

import type {
  INotificationsService,
  CollectionEventType,
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
    _metadata?: Record<string, unknown>
  ): Promise<void> {
    // No-op
  }

  async processScheduledNotifications(): Promise<{ processed: number; errors: number }> {
    return { processed: 0, errors: 0 }
  }

  async scheduleTimeBasedNotifications(_collectionId: string): Promise<void> {
    // No-op
  }

  async markAsRead(_notificationId: string, _userId: string): Promise<void> {
    // No-op
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

  async detectAndFireMissedDeadlines(): Promise<{ fired: number }> {
    return { fired: 0 }
  }

  async rescheduleForUpdatedCollections(): Promise<{ rescheduled: number }> {
    return { rescheduled: 0 }
  }

  async handleCommentAdded(
    _collectionId: string,
    _stepNoteKey: string,
    _commentUserId: string,
    _commentText: string
  ): Promise<void> {
    // No-op
  }
}
