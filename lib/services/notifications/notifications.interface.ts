/**
 * Notifications service interface.
 * Abstraction for sending notifications (email, in-app, etc.) when collection events occur.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 */

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
}
