import type { Entity } from "@/lib/types"

/**
 * Repository interface for Entity persistence.
 * Implementations must be entity-type agnostic (no business rules).
 */
export interface IEntityRepository {
  /**
   * Creates a new entity and returns it with a generated ID.
   * @param data Entity data without ID
   * @returns The created entity with ID
   */
  createEntity(data: Omit<Entity, "id">): Promise<Entity>

  /**
   * Retrieves an entity by its ID.
   * @param id Entity identifier
   * @returns The entity if found, null otherwise
   */
  getEntityById(id: string): Promise<Entity | null>

  /**
   * Updates an existing entity with partial data.
   * @param id Entity identifier
   * @param data Partial entity data to update
   * @returns The updated entity, or null if not found
   */
  updateEntity(id: string, data: Partial<Omit<Entity, "id" | "type">>): Promise<Entity | null>

  /**
   * Retrieves all entities.
   * @returns Array of all entities
   */
  getAllEntities(): Promise<Entity[]>
}
