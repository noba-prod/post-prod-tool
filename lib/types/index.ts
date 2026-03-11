/**
 * Core types for User and Entity creation flows.
 * 
 * Single source of truth: noba-poc/docs/context/user-and-entity-creation.md
 */

// =============================================================================
// BASE TYPES
// =============================================================================

/**
 * User roles within an entity.
 */
export type Role = "admin" | "editor" | "viewer"

/**
 * Supported entity types in the noba* ecosystem.
 */
export type EntityType =
  | "noba"
  | "client"
  | "agency"
  | "photo-lab"
  | "edition-studio"
  | "hand-print-lab"
  | "self-photographer"

// =============================================================================
// MODELS
// =============================================================================

/**
 * Physical location for entities that require it.
 * Required for: agency, photo-lab, edition-studio, hand-print-lab
 * Not required for: client
 */
export interface Location {
  streetAddress: string
  zipCode: string
  city: string
  country: string
}

/**
 * Represents an organization or individual actor in the ecosystem.
 */
export interface Entity {
  id: string
  type: EntityType
  name: string
  email?: string
  phoneNumber?: string
  profilePictureUrl?: string
  notes?: string
  location?: Location
  /** Timestamp when the entity was last updated */
  updatedAt?: Date
}

/**
 * Represents an individual person interacting with the system.
 * Users are always associated with an entity.
 */
export interface User {
  id: string
  firstName: string
  lastName?: string
  email: string
  phoneNumber: string
  entityId: string
  role: Role
  profilePictureUrl?: string
  notes?: string
}

// =============================================================================
// PAYLOADS - Creation inputs
// =============================================================================

/**
 * Payload for creating a generic team member.
 * Used when adding new members to an existing entity.
 */
export interface CreateUserPayload {
  firstName: string
  lastName?: string
  email: string
  phoneNumber: string
  countryCode: string
  role: Role
  notes?: string
}

/**
 * Payload for creating an admin user.
 * Role is fixed to "admin" - this is an alias for type clarity.
 */
export interface CreateAdminUserPayload extends Omit<CreateUserPayload, "role"> {
  role: "admin"
}

/**
 * Payload for updating an existing user.
 * All fields are optional except those that cannot be changed (id, entityId).
 */
export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  countryCode?: string
  role?: Role
  profilePictureUrl?: string | null
  notes?: string
}

/**
 * Payload for Step 1: Basic Information (entity draft).
 * Entity is not persisted until admin user is created.
 */
export interface CreateEntityDraftPayload {
  type: EntityType
  name: string
  email?: string
  phoneNumber?: string
  profilePictureUrl?: string
  notes?: string
  location?: Location
}

/**
 * Combined payload for creating an entity with its admin user.
 * This represents the atomic operation: entity + admin user creation.
 */
export interface CreateEntityWithAdminPayload {
  draft: CreateEntityDraftPayload
  admin: CreateUserPayload
}

// =============================================================================
// RETURN TYPES - Service responses
// =============================================================================

/**
 * Result of creating an entity with its admin user.
 * Returned by the entity creation service.
 */
export interface CreateEntityWithAdminResult {
  entityId: string
  entity: Entity
  adminUser: User
  teamMembers: User[]
}

// =============================================================================
// PAGE-LEVEL STATE
// =============================================================================

/**
 * State type for the entity creation page.
 * Manages the multi-step wizard flow.
 */
export interface EntityCreationState {
  /** Draft data from Step 1 (Basic Information) */
  basicDraft: CreateEntityDraftPayload | null
  /** Entity ID once created (after admin user submission) */
  entityId: string | null
  /** Current step in the creation wizard */
  currentStep: "basic" | "team"
  /** List of team members (starts with admin user) */
  teamMembers: User[]
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Entity types that use the standard two-step creation flow.
 * Excludes self-photographer which has a single-step modal flow.
 */
export type StandardEntityType = Exclude<EntityType, "self-photographer">

/**
 * Entity types that require a physical location.
 * Required for: photo-lab, edition-studio, hand-print-lab
 * Not required for: noba, client, self-photographer, agency
 */
export type EntityTypeWithLocation =
  | "photo-lab"
  | "edition-studio"
  | "hand-print-lab"

/**
 * Entity types that do NOT require a physical location.
 */
export type EntityTypeWithoutLocation = "noba" | "client" | "self-photographer" | "agency"

/**
 * Check if an entity type requires location.
 * Based on domain rules:
 * - Requires location: photo-lab, edition-studio, hand-print-lab
 * - Does NOT require location: noba, client, self-photographer, agency
 */
export function entityRequiresLocation(type: EntityType): type is EntityTypeWithLocation {
  const typesRequiringLocation: EntityType[] = [
    "photo-lab",
    "edition-studio",
    "hand-print-lab",
  ]
  return typesRequiringLocation.includes(type)
}

/**
 * Check if an entity type uses the standard two-step creation flow.
 */
export function isStandardEntityType(type: EntityType): type is StandardEntityType {
  return type !== "self-photographer"
}

/**
 * Display name mapping for entity types.
 */
export const ENTITY_TYPE_DISPLAY_NAMES: Record<EntityType, string> = {
  "noba": "noba*",
  "client": "Client",
  "agency": "Agency",
  "photo-lab": "Photo Lab",
  "edition-studio": "Retouch/Post Studio",
  "hand-print-lab": "Hand Print Lab",
  "self-photographer": "Photographer",
}

/**
 * Display name mapping for roles.
 */
export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  "admin": "Admin",
  "editor": "Editor",
  "viewer": "Viewer",
}

// =============================================================================
// LABEL HELPERS
// =============================================================================

/**
 * Get human-friendly display label for an entity type.
 * @example entityTypeToLabel("photo-lab") // "Photo Lab"
 */
export function entityTypeToLabel(type: EntityType): string {
  return ENTITY_TYPE_DISPLAY_NAMES[type]
}

/**
 * Get human-friendly display label for a role.
 * Returns "Viewer" when role is null/undefined or not in ROLE_DISPLAY_NAMES.
 * @example roleToLabel("admin") // "Admin"
 */
export function roleToLabel(role: Role | undefined | null): string {
  if (role == null) return "Viewer"
  return ROLE_DISPLAY_NAMES[role] ?? "Viewer"
}

/**
 * All standard entity types (excludes self-photographer).
 * Useful for rendering entity type options.
 */
export const STANDARD_ENTITY_TYPES: StandardEntityType[] = [
  "noba",
  "client",
  "agency",
  "photo-lab",
  "edition-studio",
  "hand-print-lab",
]

/**
 * Roles available in role selectors (Admin and Editor only).
 * Viewer has been removed from selectors for both noba* and entities.
 */
export const SELECTABLE_ROLES: Role[] = ["admin", "editor"]

/**
 * All roles (includes viewer for backward compatibility with existing data).
 * Use SELECTABLE_ROLES for role pickers in forms.
 */
export const ALL_ROLES: Role[] = ["admin", "editor", "viewer"]
