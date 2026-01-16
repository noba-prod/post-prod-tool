import type { Entity } from "@/lib/types"
import type { IEntityRepository } from "../interfaces/entity-repository.interface"

/**
 * Generates a unique ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp + random.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Module-level storage for entities.
 * Persists across calls within the same session.
 */
const entityStore = new Map<string, Entity>()

/**
 * In-memory implementation of IEntityRepository.
 * Used for development and testing without a database.
 */
export class InMemoryEntityRepository implements IEntityRepository {
  /**
   * Creates a new entity and stores it in memory.
   * @param data Entity data without ID
   * @returns The created entity with generated ID
   */
  async createEntity(data: Omit<Entity, "id">): Promise<Entity> {
    const id = generateId()
    const now = new Date()
    const entity: Entity = { 
      id, 
      ...data,
      updatedAt: data.updatedAt || now, // Use provided updatedAt or current time
    }
    entityStore.set(id, entity)
    return entity
  }

  /**
   * Retrieves an entity by its ID from memory.
   * @param id Entity identifier
   * @returns The entity if found, null otherwise
   */
  async getEntityById(id: string): Promise<Entity | null> {
    return entityStore.get(id) ?? null
  }

  /**
   * Updates an existing entity with partial data.
   * @param id Entity identifier
   * @param data Partial entity data to update (excludes id and type)
   * @returns The updated entity, or null if not found
   */
  async updateEntity(
    id: string,
    data: Partial<Omit<Entity, "id" | "type">>
  ): Promise<Entity | null> {
    const existing = entityStore.get(id)
    if (!existing) {
      return null
    }

    const updated: Entity = {
      ...existing,
      ...data,
      // Preserve immutable fields
      id: existing.id,
      type: existing.type,
      // Update timestamp
      updatedAt: new Date(),
    }

    entityStore.set(id, updated)
    return updated
  }

  /**
   * Resets the in-memory store.
   * Useful for testing and development.
   */
  static reset(): void {
    entityStore.clear()
  }

  /**
   * Retrieves all entities from memory.
   * @returns Array of all entities
   */
  async getAllEntities(): Promise<Entity[]> {
    return Array.from(entityStore.values())
  }

  /**
   * Returns all stored entities (static version).
   * Useful for debugging.
   */
  static getAll(): Entity[] {
    return Array.from(entityStore.values())
  }
}
