export { CollectionsService, CollectionsServiceError } from "./collections.service"

import { CollectionsService } from "./collections.service"
import { InMemoryCollectionsRepository } from "@/lib/infra/collections"

let collectionsServiceInstance: CollectionsService | null = null

/**
 * Factory that returns a CollectionsService wired to the in-memory repository.
 * This is the only place that imports the in-memory implementation.
 * UI uses this; later we swap the repo implementation for Supabase.
 */
export function createCollectionsService(): CollectionsService {
  if (!collectionsServiceInstance) {
    collectionsServiceInstance = new CollectionsService(
      new InMemoryCollectionsRepository()
    )
  }
  return collectionsServiceInstance
}
