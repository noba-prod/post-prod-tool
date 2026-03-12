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
  "photo_lab",
  "handprint_lab",
  "retouch_studio",
] as const

export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number]

/** DB-level role names stored in collections.current_owners */
export type CurrentOwnerRole =
  | "noba"
  | "client"
  | "photographer"
  | "agency"
  | "photo_lab"
  | "retouch_studio"
  | "handprint_lab"

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
  "photographer_check_client_selection",
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
  "photographer_check_client_selection", // Hand print only: photographer validates client selection before LR→HR
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
  /** Reference code / identifier */
  reference?: string
  /** Client entity id */
  clientEntityId: string
  /** Client responsible user id — producer / noba */
  managerUserId: string
  /** User who created the collection (producer with is_owner in collection_members). Single source for owner in noba* section. */
  ownerUserId?: string
  /** noba* internal user ids (owner + additional members). Owner = user creating the collection; others added via "New member". */
  nobaUserIds?: string[]
  /** Edit permission by user id for noba* members (milestone edit power once published). */
  nobaEditPermissionByUserId?: Record<string, boolean>
  /** Photographer collaborates with an agency (collections-logic §4.1 Agency Logic) */
  hasAgency: boolean
  /** Low-res lab involved (doc: Lab low-res appears when handprint marked — we treat as explicit flag for step/participant visibility) */
  hasLowResLab: boolean
  /** Handprint lab (high-res) involved */
  hasHandprint: boolean
  /** Handprint lab is a different lab than low-res (collections-logic §10.6). Only applies when handprintVariant is "hp". */
  handprintIsDifferentLab: boolean
  /** When hasHandprint: "hp" = Analog (HP), handprint lab can differ; "hr" = Analog (HR), photo_lab does conversions. */
  handprintVariant?: "hp" | "hr"
  /** Edition / Retouch studio involved */
  hasEditionStudio: boolean
  /** Shooting date (key date) */
  shootingDate?: string
  /** Client finals deadline (key date) — set in Check Finals step only */
  clientFinalsDeadline?: string
  /** Client finals deadline time — set in Check Finals step only */
  clientFinalsDeadlineTime?: string
  /** Publishing date — from New Collection modal (optional) */
  publishingDate?: string
  /** Publishing time — from New Collection modal (optional) */
  publishingTime?: string
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
  // Low-res scan (Figma node 707-1732747)
  lowResScanDeadlineDate?: string
  lowResScanDeadlineTime?: string
  lowResShippingOriginAddress?: string
  lowResShippingPickupDate?: string
  lowResShippingPickupTime?: string
  lowResShippingDestinationAddress?: string
  lowResShippingDeliveryDate?: string
  lowResShippingDeliveryTime?: string
  lowResShippingManaging?: string
  lowResShippingProvider?: string
  lowResShippingTracking?: string
  // Photo selection (Figma node 710-1734582; collections-logic §10.4, §10.5)
  photoSelectionPhotographerDueDate?: string
  photoSelectionPhotographerDueTime?: string
  photoSelectionClientDueDate?: string
  photoSelectionClientDueTime?: string
  // Photographer check client selection (Hand print only; Figma 791-60709 — before LR→HR)
  photographerCheckDueDate?: string
  photographerCheckDueTime?: string
  // LR to HR setup (Figma node 712-1735600; collections-logic §10.6 — lab sends high-res selection to photographer)
  lrToHrDueDate?: string
  lrToHrDueTime?: string
  // Pre-check & Edition (Figma node 714-1736413; collections-logic §10.7, §10.8 — photographer retouch instructions, edition studio final edits)
  editionPhotographerDueDate?: string
  editionPhotographerDueTime?: string
  editionStudioDueDate?: string
  editionStudioDueTime?: string
  // Check Finals (Figma node 716-1738375; collections-logic §5.1 — photographer check and client approve finals)
  checkFinalsPhotographerDueDate?: string
  checkFinalsPhotographerDueTime?: string
  checkFinalsClientDueDate?: string
  checkFinalsClientDueTime?: string
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
// COLLECTION (collections-logic §2, §3.3, §4) — single entity for draft + published
// =============================================================================

export type CollectionStatus =
  | "draft"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "canceled"

/** Substatus when status = in_progress; order: shooting → … → client_confirmation (completion is explicit via event). */
export type CollectionSubstatus =
  | "shooting"
  | "negatives_drop_off"
  | "low_res_scanning"
  | "photographer_selection"
  | "client_selection"
  | "low_res_to_high_res"
  | "edition_request"
  | "final_edits"
  | "photographer_last_check"
  | "client_confirmation"

export interface Collection {
  id: string
  status: CollectionStatus
  /** Workflow stage when status is in_progress; undefined when not in_progress. */
  substatus?: CollectionSubstatus
  /** Per-step status map: stepId → { stage, health }. Persisted in DB, updated on each event. */
  stepStatuses?: Record<string, { stage: string; health: string | null }>
  /** Completion percentage (0-100) based on count of "done" visible steps. */
  completionPercentage?: number
  /** Current active owner roles (derived from the active in-progress step). */
  currentOwners?: CurrentOwnerRole[]
  config: CollectionConfig
  participants: CollectionParticipant[]
  creationData: CreationData
  updatedAt: string
  /** Set when status changes from draft to upcoming/in_progress (publish). */
  publishedAt?: string
  /** URLs where low-res scans/photos are shared (step 3). JSONB array — latest is last. */
  lowResSelectionUrl?: string[]
  /** When the low-res URL was last set (ISO timestamp). */
  lowResSelectionUploadedAt?: string
  /** URLs where photographer selection is shared (step 4). JSONB array. */
  photographerSelectionUrl?: string[]
  /** When the photographer selection URL was last set (ISO timestamp). */
  photographerSelectionUploadedAt?: string
  /** URLs where client final selection is shared (step 5). JSONB array. */
  clientSelectionUrl?: string[]
  /** When the client selection URL was last set (ISO timestamp). */
  clientSelectionUploadedAt?: string
  /** URLs uploaded by photographer during review/validation of client selection (step 6). JSONB array. */
  photographerReviewUrl?: string[]
  /** When the photographer review URL was last set (ISO timestamp). */
  photographerReviewUploadedAt?: string
  /** URLs for high-res selection (step 7). JSONB array. */
  highResSelectionUrl?: string[]
  /** When the high-res URL was last set (ISO timestamp). */
  highResSelectionUploadedAt?: string
  /** URLs for edition instructions (step 8). JSONB array. */
  editionInstructionsUrl?: string[]
  /** When the edition instructions URL was last set (ISO timestamp). */
  editionInstructionsUploadedAt?: string
  /** URLs for finals selection (step 9). JSONB array. */
  finalsSelectionUrl?: string[]
  /** When the finals URL was last set (ISO timestamp). */
  finalsSelectionUploadedAt?: string
  /** URLs added by photographer in step 10 (last check) when finals need additional links. JSONB array. */
  photographerLastCheckUrl?: string[]
  /** When the last photographer last check URL was uploaded (ISO timestamp). */
  photographerLastCheckUploadedAt?: string
  /** Step notes conversations (JSONB arrays per step). */
  stepNotesLowRes?: StepNoteEntry[]
  stepNotesPhotographerSelection?: StepNoteEntry[]
  stepNotesClientSelection?: StepNoteEntry[]
  stepNotesPhotographerReview?: StepNoteEntry[]
  stepNotesHighRes?: StepNoteEntry[]
  stepNotesEditionRequest?: StepNoteEntry[]
  stepNotesFinalEdits?: StepNoteEntry[]
  stepNotesPhotographerLastCheck?: StepNoteEntry[]
  stepNotesClientConfirmation?: StepNoteEntry[]
}

/** A single entry in a step notes conversation. */
export interface StepNoteEntry {
  /** Role of the note author (e.g. "photo_lab", "photographer", "client", "retouch_studio"). */
  from: string
  /** The note text. */
  text: string
  /** ISO timestamp when the note was added. */
  at: string
  /** Profile ID (auth user) who wrote this note. Added in migration 040+; absent in legacy notes. */
  userId?: string
  /** URL this note is associated with (from the step's URL array). Links comment to a specific link block. */
  url?: string
}

/** Alias for backward compatibility; workflow and UI use same shape. */
export type CollectionDraftStatus = "draft" | "upcoming" | "in_progress"

/** @deprecated Use Collection. Kept for gradual migration. */
export type CollectionDraft = Collection

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
