import type { EntityType } from "@/lib/types"

/**
 * Navigation configuration based on entity type.
 */
interface NavigationConfig {
  /** NavBar variant to use */
  navBarVariant: "noba" | "collaborator" | "photographer"
  /** Available tabs for this entity type */
  availableTabs: string[]
  /** Whether user can access Entities section */
  canAccessEntities: boolean
  /** Whether user can access Team section */
  canAccessTeam: boolean
}

/**
 * Hook to determine navigation configuration based on entity type.
 * 
 * Rules (from users-roles-access-model.md):
 * - noba: variant "noba", tabs ["Collections", "Entities", "Team"]
 * - self-photographer: variant "photographer", tabs ["Collections"]
 * - Other entities: variant "collaborator", tabs ["Collections", "Team"]
 * 
 * @param entityType Entity type (null if not loaded)
 * @returns Navigation configuration
 */
export function useNavigationConfig(
  entityType: EntityType | null
): NavigationConfig {
  // noba users
  if (entityType === "noba") {
    return {
      navBarVariant: "noba",
      availableTabs: ["Collections", "Entities", "Team"],
      canAccessEntities: true,
      canAccessTeam: true,
    }
  }

  // self-photographer (no team, no entities)
  if (entityType === "self-photographer") {
    return {
      navBarVariant: "photographer",
      availableTabs: ["Collections"],
      canAccessEntities: false,
      canAccessTeam: false,
    }
  }

  // Other entity types (client, agency, photo-lab, etc.)
  return {
    navBarVariant: "collaborator",
    availableTabs: ["Collections", "Team"],
    canAccessEntities: false,
    canAccessTeam: true,
  }
}
