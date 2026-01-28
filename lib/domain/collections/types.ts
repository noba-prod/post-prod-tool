/**
 * Collections domain types.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 * No UI, no React, no database. Pure contracts.
 */

// =============================================================================
// PARTICIPANT ROLES (collections-logic §4.1)
// =============================================================================

export const PARTICIPANT_ROLES = [
  "producer",
  "client",
  "photographer",
  "agency",
  "lab",
  "handprint_lab",
  "edition_studio",
] as const

export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number]

// =============================================================================
// STABLE STEP IDS — Execution / View Mode (collections-logic §10)
// Never depend on UI ordering.
// =============================================================================

export const STEP_IDS = [
  "shooting",
  "negatives_dropoff",
  "low_res_scanning",
  "photographer_selection",
  "client_selection",
  "handprint_high_res",
  "edition_request",
  "final_edits",
  "photographer_last_check",
  "client_confirmation",
] as const

export type StepId = (typeof STEP_IDS)[number]

// =============================================================================
// CREATION BLOCK IDS — Creation Template sidebar steps (collections-logic §4)
// =============================================================================

export const CREATION_BLOCK_IDS = [
  "participants",
  "shooting_setup",
  "dropoff_plan",
  "low_res_config",
  "photographer_selection_config",
  "client_selection_config",
  "photo_selection", // UI step "Photo selection" — requiredBlocks: [photographer_selection_config, client_selection_config]
  "lr_to_hr_setup",
  "handprint_high_res_config",
  "edition_config",
  "check_finals",
] as const

export type CreationBlockId = (typeof CREATION_BLOCK_IDS)[number]

// =============================================================================
// COLLECTION CONFIG — Output of "New Collection" modal (collections-logic §3.2)
// =============================================================================

export interface CollectionConfig {
  /** Collection name */
  name: string
  /** Client entity id */
  clientEntityId: string
  /** Manager (admin) user id — producer / noba */
  managerUserId: string
  /** Photographer collaborates with an agency (collections-logic §4.1 Agency Logic) */
  hasAgency: boolean
  /** Low-res lab involved (doc: Lab low-res appears when handprint marked — we treat as explicit flag for step/participant visibility) */
  hasLowResLab: boolean
  /** Handprint lab (high-res) involved */
  hasHandprint: boolean
  /** Handprint lab is a different lab than low-res (collections-logic §10.6) */
  handprintIsDifferentLab: boolean
  /** Edition / Retouch studio involved */
  hasEditionStudio: boolean
  /** Shooting date (key date) */
  shootingDate?: string
  /** Client finals deadline (key date) */
  clientFinalsDeadline?: string
  // Shooting setup (DB-aligned, per Figma node 697-1729404)
  shootingStartDate?: string
  shootingStartTime?: string
  shootingEndDate?: string
  shootingEndTime?: string
  shootingStreetAddress?: string
  shootingZipCode?: string
  shootingCity?: string
  shootingCountry?: string
  // Drop-off plan (DB-aligned, per Figma node 701-1730993)
  dropoff_shipping_origin_address?: string
  dropoff_shipping_date?: string
  dropoff_shipping_time?: string
  dropoff_shipping_destination_address?: string
  dropoff_delivery_date?: string
  dropoff_delivery_time?: string
  dropoff_managing_shipping?: string
  dropoff_shipping_carrier?: string
  dropoff_shipping_tracking?: string
}

// =============================================================================
// PARTICIPANT ENTRY — One participant slot per role/entity (collections-logic §4.1)
// =============================================================================

export interface CollectionParticipant {
  role: ParticipantRole
  entityId?: string
  /** User ids invited for this participant slot */
  userIds?: string[]
  /** Edit permission by user id (collection-level edit rights) */
  editPermissionByUserId?: Record<string, boolean>
}

// =============================================================================
// CREATION DATA — Which blocks are filled (collections-logic §4)
// =============================================================================

export interface CreationData {
  /** Block ids that have been completed */
  completedBlockIds: CreationBlockId[]
}

// =============================================================================
// COLLECTION DRAFT (collections-logic §2, §3.3, §4)
// =============================================================================

export type CollectionDraftStatus = "draft"

export interface CollectionDraft {
  id: string
  status: CollectionDraftStatus
  config: CollectionConfig
  participants: CollectionParticipant[]
  creationData: CreationData
  updatedAt: string
}

// =============================================================================
// CREATION TEMPLATE STEP — One row in the Creation Template sidebar (collections-logic §4)
// =============================================================================

export interface CreationTemplateStep {
  /** Stable id for this step in the creation flow */
  stepId: CreationBlockId
  /** Blocks required within this step (if any sub-structure) */
  requiredBlocks: CreationBlockId[]
  /** Which participant roles own / are responsible for this block */
  ownerRoles: ParticipantRole[]
  /** Whether this step is mandatory for draft completion */
  mandatory: boolean
}

// =============================================================================
// USER FOR PERMISSION CHECK — Minimal shape for canUserEditStep (collections-logic §8, §9)
// =============================================================================

export interface UserForPermission {
  /** Role of the user in the collection context (from participants) */
  role: ParticipantRole
  /** Whether the user has edit permission enabled for this collection */
  hasEditPermission: boolean
}
