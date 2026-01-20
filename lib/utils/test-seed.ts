import type { EntityType, Role, User, Entity } from "@/lib/types"
import { entityRequiresLocation, entityTypeToLabel } from "@/lib/types"
import { createEntityCreationService, getRepositoryInstances } from "@/lib/services"

/**
 * Helper function to seed a test user with entity and role.
 * 
 * This function:
 * - Creates or finds an entity of the specified type
 * - Creates a user associated with that entity
 * - Handles self-photographer special case (no roles, always admin)
 * - Persists data to localStorage via repositories
 * 
 * @param email User email (normalized to lowercase)
 * @param entityType Type of entity (including "noba" and "self-photographer")
 * @param role User role (ignored for self-photographer, always "admin")
 * @param firstName User first name (optional, extracted from email if not provided)
 * @param lastName User last name (optional)
 * @param entityName Entity name (optional, auto-generated if not provided for standard entities)
 * @returns Created user and entity
 */
export async function seedTestUser(
  email: string,
  entityType: EntityType,
  role?: Role,
  firstName?: string,
  lastName?: string,
  entityName?: string
): Promise<{ user: User; entity: Entity }> {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Get repository instances
  const { entityRepository, userRepository } = getRepositoryInstances()
  if (!entityRepository || !userRepository) {
    throw new Error("Repositories not initialized. Call createEntityCreationService() first.")
  }

  // Handle self-photographer special case
  if (entityType === "self-photographer") {
    // For self-photographer, use the service method
    const service = createEntityCreationService()
    
    // Use provided firstName/lastName or extract from email
    let userFirstName: string
    let userLastName: string | undefined
    
    if (firstName) {
      userFirstName = firstName.trim()
      userLastName = lastName?.trim() || undefined
    } else {
      // Extract name from email (use email prefix as firstName)
      const emailPrefix = normalizedEmail.split("@")[0]
      userFirstName = emailPrefix.split(".")[0] || emailPrefix
      userLastName = emailPrefix.split(".").slice(1).join(" ") || undefined
    }
    
    const result = await service.createSelfPhotographer({
      firstName: userFirstName.charAt(0).toUpperCase() + userFirstName.slice(1),
      lastName: userLastName ? userLastName.charAt(0).toUpperCase() + userLastName.slice(1) : undefined,
      email: normalizedEmail,
      phoneNumber: "123456789",
      countryCode: "+34",
      notes: "Test self-photographer user",
    })
    
    return {
      user: result.adminUser,
      entity: result.entity,
    }
  }

  // For other entity types, find or create entity
  let entity: Entity | null = null
  
  // Determine the desired entity name
  let desiredEntityName: string
  if (entityName && entityName.trim()) {
    desiredEntityName = entityName.trim()
  } else if (entityType === "noba") {
    desiredEntityName = "noba*"
  } else {
    desiredEntityName = `Test ${entityTypeToLabel(entityType)}`
  }
  
  // Try to find existing entity with exact name match (case-insensitive)
  const allEntities = await entityRepository.getAllEntities()
  const existingEntity = allEntities.find(
    (e) => e.type === entityType && e.name.toLowerCase().trim() === desiredEntityName.toLowerCase().trim()
  )
  
  if (existingEntity) {
    // Reuse existing entity with matching name
    entity = existingEntity
  } else {
    // Create new entity with the desired name
    const draft: any = {
      type: entityType,
      name: desiredEntityName,
      email: `${entityType}@test.com`,
      phoneNumber: "+34 123456789",
      notes: `Test entity for ${entityType}`,
    }
    
    // Add location if required
    if (entityRequiresLocation(entityType)) {
      draft.location = {
        streetAddress: "123 Test Street",
        zipCode: "28001",
        city: "Madrid",
        country: "Spain",
      }
    }
    
    entity = await entityRepository.createEntity(draft)
  }

  // Check if user already exists
  const allUsers = await userRepository.getAllUsers()
  const existingUser = allUsers.find((u) => u.email.toLowerCase() === normalizedEmail)
  
  if (existingUser) {
    // User already exists, return it
    return {
      user: existingUser,
      entity: entity,
    }
  }

  // Create new user
  // Use provided firstName/lastName or extract from email
  let userFirstName: string
  let userLastName: string | undefined
  
  if (firstName) {
    userFirstName = firstName.trim()
    userLastName = lastName?.trim() || undefined
  } else {
    // Extract name from email
    const emailPrefix = normalizedEmail.split("@")[0]
    const nameParts = emailPrefix.split(".")
    userFirstName = nameParts[0] || emailPrefix
    userLastName = nameParts.slice(1).join(" ") || undefined
  }

  const user = await userRepository.createUser({
    firstName: userFirstName.charAt(0).toUpperCase() + userFirstName.slice(1),
    lastName: userLastName ? userLastName.charAt(0).toUpperCase() + userLastName.slice(1) : undefined,
    email: normalizedEmail,
    phoneNumber: "+34 123456789",
    entityId: entity.id,
    role: role || "admin", // Default to admin if role not provided
    notes: `Test user for ${entityType}`,
  })

  return {
    user,
    entity,
  }
}
