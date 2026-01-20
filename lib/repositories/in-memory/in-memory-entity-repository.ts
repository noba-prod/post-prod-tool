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
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = "noba_entities"

/**
 * Module-level storage for entities.
 * Persists across calls within the same session and across page refreshes via localStorage.
 */
const entityStore = new Map<string, Entity>()

/**
 * Load entities from localStorage into memory.
 */
function loadFromStorage(): void {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const entities: Entity[] = JSON.parse(stored)
      entities.forEach((e) => {
        // Convert updatedAt string back to Date if present
        if (e.updatedAt && typeof e.updatedAt === "string") {
          e.updatedAt = new Date(e.updatedAt)
        }
        entityStore.set(e.id, e)
      })
    }
  } catch (error) {
    console.warn("Failed to load entities from localStorage:", error)
  }
}

/**
 * Save entities from memory to localStorage.
 */
function saveToStorage(): void {
  if (typeof window === "undefined") return
  try {
    const entities = Array.from(entityStore.values())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities))
  } catch (error) {
    console.warn("Failed to save entities to localStorage:", error)
  }
}

// Load from localStorage on module initialization
if (typeof window !== "undefined") {
  loadFromStorage()
}

/**
 * In-memory implementation of IEntityRepository.
 * Used for development and testing without a database.
 * Persists data to localStorage automatically.
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
    saveToStorage()
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
    saveToStorage()
    return updated
  }

  /**
   * Resets the in-memory store and localStorage.
   * Useful for testing and development.
   */
  static reset(): void {
    entityStore.clear()
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
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
