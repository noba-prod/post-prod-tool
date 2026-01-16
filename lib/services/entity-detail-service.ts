import type { IEntityRepository } from "@/lib/repositories/interfaces/entity-repository.interface"
import type { IUserRepository } from "@/lib/repositories/interfaces/user-repository.interface"
import type { Entity, User } from "@/lib/types"

// =============================================================================
// TYPES
// =============================================================================

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
  constructor(
    private readonly entityRepository: IEntityRepository,
    private readonly userRepository: IUserRepository
  ) {}

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
    // Fetch entity
    const entity = await this.entityRepository.getEntityById(entityId)
    
    if (!entity) {
      throw new EntityNotFoundError(entityId)
    }

    // Fetch team members
    const teamMembers = await this.userRepository.listUsersByEntityId(entityId)

    // Find admin users
    const adminUsers = teamMembers.filter((user) => user.role === "admin")
    
    // Primary admin is the first one found (or null if none)
    const adminUser = adminUsers.length > 0 ? adminUsers[0] : null

    return {
      entity,
      teamMembers,
      adminUser,
      adminUsers,
    }
  }

  /**
   * Checks if an entity exists.
   * 
   * @param entityId The entity ID to check
   * @returns true if the entity exists, false otherwise
   */
  async entityExists(entityId: string): Promise<boolean> {
    const entity = await this.entityRepository.getEntityById(entityId)
    return entity !== null
  }
}
