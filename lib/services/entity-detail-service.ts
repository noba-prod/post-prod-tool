import type { Entity, User } from "@/lib/types"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Collection item returned for entity detail (collections where entity is invited).
 */
export interface EntityDetailCollectionItem {
  id: string
  name: string
  status: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
  clientName: string
  location: string
  startDate: string
  endDate: string
  participants: number
}

/**
 * Result of fetching entity details with team members.
 */
export interface EntityDetailResult {
  /** The entity */
  entity: Entity
  /** All team members belonging to this entity */
  teamMembers: User[]
  /** The primary admin user (first admin found), or null if none */
  adminUser: User | null
  /** All admin users (in case of multiple admins) */
  adminUsers: User[]
  /** Collections where this entity is invited (client or participant), all statuses */
  collectionsList?: EntityDetailCollectionItem[]
}

/**
 * Error thrown when an entity is not found.
 */
export class EntityNotFoundError extends Error {
  constructor(entityId: string) {
    super(`Entity not found: ${entityId}`)
    this.name = "EntityNotFoundError"
  }
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Service for fetching entity details with related data.
 * 
 * Provides convenience methods to fetch an entity along with
 * its team members in a single call.
 * 
 * Uses repository interfaces for future DB compatibility.
 */
export class EntityDetailService {

  /**
   * Fetches an entity with all its team members.
   * 
   * @param entityId The entity ID to fetch
   * @returns Entity details including team members and admin user
   * @throws EntityNotFoundError if the entity doesn't exist
   * 
   * @example
   * ```tsx
   * const service = createEntityDetailService()
   * const { entity, teamMembers, adminUser } = await service.getEntityWithTeamMembers(entityId)
   * ```
   */
  async getEntityWithTeamMembers(entityId: string): Promise<EntityDetailResult> {
    const response = await fetch(`/api/organizations/${entityId}`, {
      method: "GET",
      cache: "no-store",
    })

    if (response.status === 404) {
      throw new EntityNotFoundError(entityId)
    }

    if (!response.ok) {
      const errorBody = (await response.json()) as { error?: string }
      throw new Error(errorBody.error || "Failed to fetch entity details")
    }

    const data = (await response.json()) as EntityDetailResult
    if (data.entity?.updatedAt) {
      data.entity.updatedAt = new Date(data.entity.updatedAt)
    }
    return data
  }

  /**
   * Checks if an entity exists.
   * 
   * @param entityId The entity ID to check
   * @returns true if the entity exists, false otherwise
   */
  async entityExists(entityId: string): Promise<boolean> {
    try {
      await this.getEntityWithTeamMembers(entityId)
      return true
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return false
      }
      return false
    }
  }
}
