import type { IEntityRepository } from "@/lib/repositories/interfaces/entity-repository.interface"
import type { IUserRepository } from "@/lib/repositories/interfaces/user-repository.interface"
import type {
  EntityType,
  CreateEntityDraftPayload,
  CreateUserPayload,
  CreateEntityWithAdminPayload,
  CreateEntityWithAdminResult,
  UpdateUserPayload,
  Location,
} from "@/lib/types"
import { entityRequiresLocation, isStandardEntityType } from "@/lib/types"
import { parsePhoneNumber } from "@/lib/utils/form-mappers"

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationError[]
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates a location object has all required fields.
 */
function isValidLocation(location: Location | undefined): location is Location {
  if (!location) return false
  return Boolean(
    location.streetAddress?.trim() &&
    location.zipCode?.trim() &&
    location.city?.trim() &&
    location.country?.trim()
  )
}

/**
 * Validates an entity draft payload according to business rules.
 * - Entity name and type are always required.
 * - Location is required only for entity types that need it.
 */
export function validateStandardEntityDraft(
  draft: CreateEntityDraftPayload
): ValidationResult {
  const errors: ValidationError[] = []

  // Required: type
  if (!draft.type) {
    errors.push({ field: "type", message: "Entity type is required" })
  }

  // Required: name
  if (!draft.name?.trim()) {
    errors.push({ field: "name", message: "Entity name is required" })
  }

  // Conditional: location (based on entity type)
  if (draft.type && entityRequiresLocation(draft.type)) {
    if (!isValidLocation(draft.location)) {
      errors.push({ 
        field: "location", 
        message: "Complete location is required for this entity type" 
      })
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

/**
 * Validates a user creation payload.
 */
export function validateUserPayload(
  payload: CreateUserPayload
): ValidationResult {
  const errors: ValidationError[] = []

  if (!payload.firstName?.trim()) {
    errors.push({ field: "firstName", message: "First name is required" })
  }

  if (!payload.email?.trim()) {
    errors.push({ field: "email", message: "Email is required" })
  }

  if (!payload.phoneNumber?.trim()) {
    errors.push({ field: "phoneNumber", message: "Phone number is required" })
  }

  if (!payload.role) {
    errors.push({ field: "role", message: "Role is required" })
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

// =============================================================================
// SELF-PHOTOGRAPHER PAYLOAD
// =============================================================================

/**
 * Payload for creating a self-photographer.
 * Combines entity and user data in a single-step flow.
 */
export interface CreateSelfPhotographerPayload {
  firstName: string
  lastName?: string
  email: string
  phoneNumber: string
  countryCode: string
  notes?: string
}

// =============================================================================
// SERVICE ERRORS
// =============================================================================

export class EntityCreationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly validationErrors?: ValidationError[]
  ) {
    super(message)
    this.name = "EntityCreationError"
  }
}

// =============================================================================
// ENTITY CREATION SERVICE
// =============================================================================

/**
 * Service for entity creation flows.
 * Implements business rules for all entity types.
 * 
 * Depends only on repository interfaces for future DB integration.
 */
export class EntityCreationService {
  constructor(
    private readonly entityRepository: IEntityRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Creates a standard entity with its admin user.
   * 
   * Applies to: client | agency | photo-lab | edition-studio | hand-print-lab
   * 
   * Business rules:
   * - Entity is NOT created until admin user is successfully created.
   * - This method represents the atomic commit point of the creation flow.
   * - Location is required for certain entity types.
   * 
   * @param payload Combined entity draft and admin user data
   * @returns Created entity, admin user, and team members
   * @throws EntityCreationError if validation fails or creation fails
   */
  async createStandardEntityWithAdmin(
    payload: CreateEntityWithAdminPayload
  ): Promise<CreateEntityWithAdminResult> {
    const { draft, admin } = payload

    // Validate entity type is standard (not self-photographer)
    if (!isStandardEntityType(draft.type)) {
      throw new EntityCreationError(
        `Entity type "${draft.type}" cannot use standard creation flow`,
        "INVALID_ENTITY_TYPE"
      )
    }

    // Validate entity draft
    const draftValidation = validateStandardEntityDraft(draft)
    if (!draftValidation.ok) {
      throw new EntityCreationError(
        "Entity draft validation failed",
        "VALIDATION_FAILED",
        draftValidation.errors
      )
    }

    // Validate admin user payload
    const userValidation = validateUserPayload(admin)
    if (!userValidation.ok) {
      throw new EntityCreationError(
        "Admin user validation failed",
        "VALIDATION_FAILED",
        userValidation.errors
      )
    }

    // Create entity first
    const entity = await this.entityRepository.createEntity({
      type: draft.type,
      name: draft.name.trim(),
      email: draft.email?.trim(),
      phoneNumber: draft.phoneNumber?.trim(),
      profilePictureUrl: draft.profilePictureUrl,
      notes: draft.notes?.trim(),
      location: draft.location,
    })

    // Create admin user with role forced to "admin"
    const adminUser = await this.userRepository.createUser({
      firstName: admin.firstName.trim(),
      lastName: admin.lastName?.trim(),
      email: admin.email.trim(),
      phoneNumber: `${admin.countryCode} ${admin.phoneNumber}`.trim(),
      entityId: entity.id,
      role: "admin", // Always admin for this flow
      notes: admin.notes?.trim(),
    })

    // Get all team members (starts with admin)
    const teamMembers = await this.userRepository.listUsersByEntityId(entity.id)

    return {
      entityId: entity.id,
      entity,
      adminUser,
      teamMembers,
    }
  }

  /**
   * Creates a self-photographer entity with its admin user.
   * 
   * Applies ONLY to: self-photographer
   * 
   * Business rules:
   * - Single-step creation via modal (no team management step).
   * - Entity type is fixed to "self-photographer".
   * - Role is fixed to "admin".
   * - Entity name is derived from user's first + last name.
   * 
   * @param payload User data for the self-photographer
   * @returns Created entity, admin user, and team members
   * @throws EntityCreationError if validation fails or creation fails
   */
  async createSelfPhotographer(
    payload: CreateSelfPhotographerPayload
  ): Promise<CreateEntityWithAdminResult> {
    // Validate required fields
    const errors: ValidationError[] = []

    if (!payload.firstName?.trim()) {
      errors.push({ field: "firstName", message: "First name is required" })
    }

    if (!payload.email?.trim()) {
      errors.push({ field: "email", message: "Email is required" })
    }

    if (!payload.phoneNumber?.trim()) {
      errors.push({ field: "phoneNumber", message: "Phone number is required" })
    }

    if (errors.length > 0) {
      throw new EntityCreationError(
        "Photographer validation failed",
        "VALIDATION_FAILED",
        errors
      )
    }

    // Derive entity name from user name
    const entityName = payload.lastName?.trim()
      ? `${payload.firstName.trim()} ${payload.lastName.trim()}`
      : payload.firstName.trim()

    // Create entity (type fixed to self-photographer)
    const entity = await this.entityRepository.createEntity({
      type: "self-photographer",
      name: entityName,
      email: payload.email?.trim(),
      phoneNumber: payload.phoneNumber?.trim(),
      notes: payload.notes?.trim(),
    })

    // Create admin user (role fixed to admin)
    const adminUser = await this.userRepository.createUser({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName?.trim(),
      email: payload.email.trim(),
      phoneNumber: `${payload.countryCode} ${payload.phoneNumber}`.trim(),
      entityId: entity.id,
      role: "admin", // Always admin for self-photographer
      notes: payload.notes?.trim(),
    })

    // Get all team members (only admin for self-photographer)
    const teamMembers = await this.userRepository.listUsersByEntityId(entity.id)

    return {
      entityId: entity.id,
      entity,
      adminUser,
      teamMembers,
    }
  }

  /**
   * Updates the basic information of an existing entity.
   * 
   * This method is used when editing Step 1 after the entity has been created.
   * It does NOT affect team members or recreate the entity.
   * 
   * @param entityId The entity to update
   * @param draft Updated entity draft data
   * @returns The updated entity
   * @throws EntityCreationError if entity doesn't exist or validation fails
   */
  async updateEntityBasicInfo(
    entityId: string,
    draft: CreateEntityDraftPayload
  ): Promise<{ entity: import("@/lib/types").Entity }> {
    // Verify entity exists
    const existing = await this.entityRepository.getEntityById(entityId)
    if (!existing) {
      throw new EntityCreationError(
        "Entity not found",
        "ENTITY_NOT_FOUND"
      )
    }

    // Validate draft (same validation as create)
    const draftValidation = validateStandardEntityDraft(draft)
    if (!draftValidation.ok) {
      throw new EntityCreationError(
        "Entity draft validation failed",
        "VALIDATION_FAILED",
        draftValidation.errors
      )
    }

    // Update entity (type cannot be changed)
    const updated = await this.entityRepository.updateEntity(entityId, {
      name: draft.name.trim(),
      email: draft.email?.trim(),
      phoneNumber: draft.phoneNumber?.trim(),
      profilePictureUrl: draft.profilePictureUrl,
      notes: draft.notes?.trim(),
      location: draft.location,
    })

    if (!updated) {
      throw new EntityCreationError(
        "Failed to update entity",
        "UPDATE_FAILED"
      )
    }

    return { entity: updated }
  }

  /**
   * Adds a new team member to an existing entity.
   * 
   * @param entityId The entity to add the member to
   * @param payload User creation data
   * @returns The created user
   * @throws EntityCreationError if entity doesn't exist or validation fails
   */
  async addTeamMember(
    entityId: string,
    payload: CreateUserPayload
  ): Promise<{ user: import("@/lib/types").User; teamMembers: import("@/lib/types").User[] }> {
    // Verify entity exists
    const entity = await this.entityRepository.getEntityById(entityId)
    if (!entity) {
      throw new EntityCreationError(
        "Entity not found",
        "ENTITY_NOT_FOUND"
      )
    }

    // Validate user payload
    const validation = validateUserPayload(payload)
    if (!validation.ok) {
      throw new EntityCreationError(
        "User validation failed",
        "VALIDATION_FAILED",
        validation.errors
      )
    }

    // Create user
    const user = await this.userRepository.createUser({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName?.trim(),
      email: payload.email.trim(),
      phoneNumber: `${payload.countryCode} ${payload.phoneNumber}`.trim(),
      entityId,
      role: payload.role,
      notes: payload.notes?.trim(),
    })

    // Update entity's updatedAt timestamp (entity was modified by adding a member)
    await this.entityRepository.updateEntity(entityId, {
      updatedAt: new Date(),
    })

    // Get updated team members list
    const teamMembers = await this.userRepository.listUsersByEntityId(entityId)

    return { user, teamMembers }
  }

  /**
   * Updates an existing user.
   * 
   * @param userId The user to update
   * @param payload Updated user data
   * @returns The updated user
   * @throws EntityCreationError if user doesn't exist or validation fails
   */
  async updateUser(
    userId: string,
    payload: UpdateUserPayload
  ): Promise<{ user: import("@/lib/types").User }> {
    // Verify user exists
    const existing = await this.userRepository.getUserById(userId)
    if (!existing) {
      throw new EntityCreationError(
        "User not found",
        "USER_NOT_FOUND"
      )
    }

    // Build update data, combining phoneNumber if both countryCode and phoneNumber are provided
    const updateData: Partial<import("@/lib/types").User> = {}

    if (payload.firstName !== undefined) {
      updateData.firstName = payload.firstName.trim()
    }
    if (payload.lastName !== undefined) {
      updateData.lastName = payload.lastName?.trim() || undefined
    }
    if (payload.email !== undefined) {
      updateData.email = payload.email.trim()
    }
    if (payload.role !== undefined) {
      updateData.role = payload.role
    }
    if (payload.notes !== undefined) {
      updateData.notes = payload.notes?.trim() || undefined
    }

    // Handle phone number: combine countryCode + phoneNumber if both provided
    if (payload.countryCode !== undefined && payload.phoneNumber !== undefined) {
      updateData.phoneNumber = `${payload.countryCode} ${payload.phoneNumber}`.trim()
    } else if (payload.phoneNumber !== undefined) {
      // If only phoneNumber provided, preserve existing countryCode or use default
      const existingPhone = existing.phoneNumber || ""
      const { countryCode } = parsePhoneNumber(existingPhone)
      updateData.phoneNumber = `${countryCode} ${payload.phoneNumber}`.trim()
    } else if (payload.countryCode !== undefined) {
      // If only countryCode provided, preserve existing phoneNumber
      const existingPhone = existing.phoneNumber || ""
      const { phoneNumber } = parsePhoneNumber(existingPhone)
      updateData.phoneNumber = `${payload.countryCode} ${phoneNumber}`.trim()
    }

    // Validate email if provided
    if (updateData.email !== undefined && !updateData.email) {
      throw new EntityCreationError(
        "Email is required",
        "VALIDATION_FAILED",
        [{ field: "email", message: "Email is required" }]
      )
    }

    // Validate firstName if provided
    if (updateData.firstName !== undefined && !updateData.firstName) {
      throw new EntityCreationError(
        "First name is required",
        "VALIDATION_FAILED",
        [{ field: "firstName", message: "First name is required" }]
      )
    }

    // Update user
    const updated = await this.userRepository.updateUser(userId, updateData)

    if (!updated) {
      throw new EntityCreationError(
        "Failed to update user",
        "UPDATE_FAILED"
      )
    }

    return { user: updated }
  }
}
