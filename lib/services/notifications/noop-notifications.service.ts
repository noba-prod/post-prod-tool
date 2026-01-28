/**
 * No-op implementation of INotificationsService.
 * Used during development/POC until real notification infrastructure is ready.
 * All methods are no-ops (do nothing).
 */

import type { INotificationsService } from "./notifications.interface"

export class NoopNotificationsService implements INotificationsService {
  async collectionPublished(_payload: {
    collectionId: string
    participantUserIds: string[]
    participantEntityIds?: string[]
  }): Promise<void> {
    // No-op: notifications will be implemented in a future milestone
  }
}
