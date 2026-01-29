import { EntityCreationService } from "../entity-creation-service"
import { EntitiesListService } from "../entities-list-service"
import { EntityDetailService } from "../entity-detail-service"
import { InMemoryEntityRepository } from "@/lib/repositories/in-memory/in-memory-entity-repository"
import { InMemoryUserRepository } from "@/lib/repositories/in-memory/in-memory-user-repository"

/**
 * Singleton instances for in-memory repositories.
 * Ensures data persists across service calls within the same session.
 */
let entityRepositoryInstance: InMemoryEntityRepository | null = null
let userRepositoryInstance: InMemoryUserRepository | null = null
let entityCreationServiceInstance: EntityCreationService | null = null
let entitiesListServiceInstance: EntitiesListService | null = null
let entityDetailServiceInstance: EntityDetailService | null = null

/**
 * Ensures repository instances are created (singleton pattern).
 */
function ensureRepositories(): void {
  if (!entityRepositoryInstance) {
    entityRepositoryInstance = new InMemoryEntityRepository()
  }
  if (!userRepositoryInstance) {
    userRepositoryInstance = new InMemoryUserRepository()
  }
}

/**
 * Factory function that creates an EntityCreationService wired with in-memory repositories.
 * 
 * This is the ONLY place that imports in-memory repository implementations.
 * UI code should use this factory, never import repositories directly.
 * 
 * Uses singleton pattern to ensure data consistency across calls.
 * 
 * @returns EntityCreationService instance
 */
export function createEntityCreationService(): EntityCreationService {
  ensureRepositories()
  if (!entityCreationServiceInstance) {
    entityCreationServiceInstance = new EntityCreationService(
      entityRepositoryInstance!,
      userRepositoryInstance!
    )
  }
  return entityCreationServiceInstance
}

/**
 * Factory function that creates an EntitiesListService wired with in-memory repositories.
 * 
 * Uses the same repository instances as EntityCreationService for data consistency.
 * 
 * @returns EntitiesListService instance
 */
export function createEntitiesListService(): EntitiesListService {
  ensureRepositories()
  if (!entitiesListServiceInstance) {
    entitiesListServiceInstance = new EntitiesListService()
  }
  return entitiesListServiceInstance
}

/**
 * Factory function that creates an EntityDetailService wired with in-memory repositories.
 * 
 * Uses the same repository instances for data consistency.
 * 
 * @returns EntityDetailService instance
 */
export function createEntityDetailService(): EntityDetailService {
  ensureRepositories()
  if (!entityDetailServiceInstance) {
    entityDetailServiceInstance = new EntityDetailService()
  }
  return entityDetailServiceInstance
}

/**
 * Resets all in-memory data and service instances.
 * Useful for testing and development.
 */
export function resetEntityCreationService(): void {
  InMemoryEntityRepository.reset()
  InMemoryUserRepository.reset()
  entityRepositoryInstance = null
  userRepositoryInstance = null
  entityCreationServiceInstance = null
  entitiesListServiceInstance = null
  entityDetailServiceInstance = null
}

/**
 * Gets the current repository instances for debugging.
 * Only available in development.
 */
export function getRepositoryInstances(): {
  entityRepository: InMemoryEntityRepository | null
  userRepository: InMemoryUserRepository | null
} {
  return {
    entityRepository: entityRepositoryInstance,
    userRepository: userRepositoryInstance,
  }
}
