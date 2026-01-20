import type { IEntityRepository } from "@/lib/repositories/interfaces/entity-repository.interface"
import type { IUserRepository } from "@/lib/repositories/interfaces/user-repository.interface"
import type { Entity, User, EntityType } from "@/lib/types"
import { entityTypeToLabel } from "@/lib/types"

// =============================================================================
// TYPES
// =============================================================================

/**
 * Entity row for display in the entities table.
 * Includes computed columns derived from related data.
 */
export interface EntityListItem {
  id: string
  name: string
  /** Display label for entity type (e.g., "Photo Lab", "Self-Photographer") */
  type: string
  /** Raw entity type for filtering */
  rawType: EntityType
  /** Admin user name (with "+N" suffix if multiple admins) */
  admin: string
  /** Admin user ID (first admin if multiple, null if none) */
  adminUserId: string | null
  /** Count of team members */
  teamMembers: number
  /** Count of collections (placeholder for future) */
  collections: number
}

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Service for listing entities with computed columns.
 * Aggregates data from entity and user repositories.
 */
export class EntitiesListService {
  constructor(
    private readonly entityRepository: IEntityRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Retrieves all entities with computed display columns.
   * 
   * @returns Array of entities with admin name, team member count, etc.
   */
  async listEntities(): Promise<EntityListItem[]> {
    // Fetch all entities and users
    const [entities, allUsers] = await Promise.all([
      this.entityRepository.getAllEntities(),
      this.userRepository.getAllUsers(),
    ])

    // Group users by entity
    const usersByEntity = new Map<string, User[]>()
    for (const user of allUsers) {
      const existing = usersByEntity.get(user.entityId) || []
      existing.push(user)
      usersByEntity.set(user.entityId, existing)
    }

    // Build list items with computed columns
    return entities.map((entity) => {
      const entityUsers = usersByEntity.get(entity.id) || []
      const admins = entityUsers.filter((u) => u.role === "admin")

      // Format admin display name
      let adminDisplay = "No admin"
      if (admins.length === 1) {
        const admin = admins[0]
        adminDisplay = admin.lastName
          ? `${admin.firstName} ${admin.lastName}`
          : admin.firstName
      } else if (admins.length > 1) {
        const firstAdmin = admins[0]
        const firstName = firstAdmin.lastName
          ? `${firstAdmin.firstName} ${firstAdmin.lastName}`
          : firstAdmin.firstName
        adminDisplay = `${firstName} (+${admins.length - 1})`
      }

      // Get entity type display label
      // For self-photographer, use "Photographer" as the display type
      const typeLabel = entity.type === "self-photographer" 
        ? "Photographer" 
        : entityTypeToLabel(entity.type)

      return {
        id: entity.id,
        name: entity.name,
        type: typeLabel,
        rawType: entity.type,
        admin: adminDisplay,
        adminUserId: admins.length > 0 ? admins[0].id : null,
        teamMembers: entityUsers.length,
        collections: 0, // Placeholder - collections not implemented yet
      }
    })
  }
}
