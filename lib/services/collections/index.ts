export { CollectionsService, CollectionsServiceError } from "./collections.service"

import type { ICollectionsRepository } from "@/lib/domain/collections"
import { InMemoryCollectionsRepository } from "@/lib/infra/collections/in-memory-collections.repository"
import { LocalStorageCollectionsRepository } from "@/lib/infra/collections/localstorage-collections.repository"
import { CollectionsService } from "./collections.service"
import { NoopNotificationsService } from "../notifications/noop-notifications.service"

/**
 * Returns the collections repository for the current runtime.
 * SSR-safe: on server (typeof window === "undefined") uses in-memory; in browser uses localStorage.
 */
export function getCollectionsRepository(): ICollectionsRepository {
  if (typeof window === "undefined") {
    return new InMemoryCollectionsRepository()
  }
  return new LocalStorageCollectionsRepository()
}

let collectionsServiceInstance: CollectionsService | null = null

/**
 * Factory that returns a CollectionsService wired to the appropriate repository
 * (localStorage in browser, in-memory on server).
 */
export function createCollectionsService(): CollectionsService {
  if (!collectionsServiceInstance) {
    collectionsServiceInstance = new CollectionsService(
      getCollectionsRepository(),
      new NoopNotificationsService()
    )
  }
  return collectionsServiceInstance
}
