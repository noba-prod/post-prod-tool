import { EntitiesListService } from "../entities-list-service"
import { EntityDetailService } from "../entity-detail-service"

let entitiesListServiceInstance: EntitiesListService | null = null
let entityDetailServiceInstance: EntityDetailService | null = null

/**
 * Factory function that creates an EntitiesListService (uses GET /api/players).
 */
export function createEntitiesListService(): EntitiesListService {
  if (!entitiesListServiceInstance) {
    entitiesListServiceInstance = new EntitiesListService()
  }
  return entitiesListServiceInstance
}

/**
 * Factory function that creates an EntityDetailService (uses GET /api/players/[id]).
 */
export function createEntityDetailService(): EntityDetailService {
  if (!entityDetailServiceInstance) {
    entityDetailServiceInstance = new EntityDetailService()
  }
  return entityDetailServiceInstance
}
