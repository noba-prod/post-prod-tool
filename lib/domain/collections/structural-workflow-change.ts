/**
 * Structural workflow change — domain layer (pure, deterministic).
 *
 * Source of truth for the producer-driven reconfiguration of a Collection's
 * structural CollectionConfig keys (type of shoot, agency, edition, etc.) after
 * creation and, when confirmed, after publication.
 *
 * Plan reference: `.cursor/plans/structural_collection_reconfig_c5805d36.plan.md`
 *
 * High-level pipeline:
 *
 *   diffStructuralConfigs(oldConfig, newConfig)
 *      ─► computes which structural keys changed
 *
 *   reconcileStructuralChange(prevCollection, newConfig)
 *      ─► returns the full reconciliation result the service needs to apply in
 *         one transactional patch (purge + step_statuses migration + creation
 *         blocks migration + participant validation).
 *
 * Conventions:
 *   • No I/O, no React, no Supabase imports.
 *   • Functions operate on cloned values; no mutation of inputs.
 *   • Tests live in `__tests__/structural-workflow-change-check.ts`.
 */

import type {
  Collection,
  CollectionConfig,
  CollectionParticipant,
  CreationBlockId,
  ParticipantRole,
} from "./types"
import type { StepStage, StepStatuses } from "./step-health"
import { getViewStepDefinitions, configToViewStepsInput, type ViewStepId } from "./view-mode-steps"
import {
  computeCreationTemplate,
  getRequiredParticipantRoles,
} from "./workflow"

// =============================================================================
// STRUCTURAL KEYS — inventory (Phase 0 of the plan)
// =============================================================================

/**
 * The subset of `CollectionConfig` keys that determine the *shape* of the workflow:
 *  • which Creation Template blocks appear
 *  • which view-mode steps are active vs inactive
 *  • which participant roles are required
 *
 * Other keys (name, reference, dates, addresses) are "safe edits" and do **not**
 * require draft-rewind / participant resync. Reading this array is the canonical
 * way to discover what makes an edit structural.
 */
export const STRUCTURAL_CONFIG_KEYS = [
  "hasLowResLab",
  "hasHandprint",
  "handprintVariant",
  "handprintIsDifferentLab",
  "hasEditionStudio",
  "hasAgency",
] as const

export type StructuralConfigKey = (typeof STRUCTURAL_CONFIG_KEYS)[number]

/**
 * DB-column mapping for documentation/debug.
 * Mirrors `lib/utils/collection-mappers.ts` (`mapDomainPatchToDbUpdate`).
 */
export const STRUCTURAL_KEYS_DB_COLUMNS: Record<StructuralConfigKey, string> = {
  hasLowResLab: "low_res_to_high_res_digital",
  hasHandprint: "low_res_to_high_res_hand_print",
  handprintVariant: "handprint_variant",
  handprintIsDifferentLab: "handprint_different_from_original_lab",
  hasEditionStudio: "photographer_request_edition",
  hasAgency: "photographer_collaborates_with_agency",
}

// =============================================================================
// DIFF
// =============================================================================

export interface StructuralDiff {
  /** Subset of STRUCTURAL_CONFIG_KEYS whose value differs between old and new. */
  changedKeys: StructuralConfigKey[]
  /** True when at least one structural key changed. */
  isStructural: boolean
  /** Per-key human-readable old → new (for dialogs, notifications metadata, logs). */
  changes: Record<
    StructuralConfigKey,
    { from: CollectionConfig[StructuralConfigKey]; to: CollectionConfig[StructuralConfigKey] } | undefined
  >
}

/**
 * Compute the structural diff between two CollectionConfig values.
 * Returns `isStructural=false` when no structural key changed (the operation
 * is then a safe edit and must NOT go through the reconfiguration pipeline).
 */
export function diffStructuralConfigs(
  oldConfig: CollectionConfig,
  newConfig: CollectionConfig
): StructuralDiff {
  const changedKeys: StructuralConfigKey[] = []
  const changes = {} as StructuralDiff["changes"]
  for (const key of STRUCTURAL_CONFIG_KEYS) {
    const fromVal = normalizeStructuralValue(key, oldConfig[key])
    const toVal = normalizeStructuralValue(key, newConfig[key])
    if (fromVal !== toVal) {
      changedKeys.push(key)
      changes[key] = { from: oldConfig[key], to: newConfig[key] }
    } else {
      changes[key] = undefined
    }
  }
  return { changedKeys, isStructural: changedKeys.length > 0, changes }
}

/**
 * Normalize raw structural-config values before comparison so that legacy /
 * partial DB rows do not produce spurious diffs.
 *
 *   • Boolean keys (`hasLowResLab`, `hasHandprint`, `hasAgency`, ...)
 *     — `null`, `undefined` and `false` are all treated as `false`. This
 *       matches the modal's `useState(false)` defaults and the DB column
 *       defaults (`BOOLEAN NOT NULL DEFAULT false`) so a `null` slipping
 *       through any layer cannot flip `isStructural` to `true`.
 *
 *   • `handprintVariant` — `null` and `undefined` are coalesced to
 *       `undefined`; any other value is preserved verbatim. When
 *       `hasHandprint` is `false`, the variant is force-normalized to
 *       `undefined` regardless of what the row carries: the variant is
 *       meaningless without `hasHandprint`, and inconsistent rows would
 *       otherwise look like a structural change every time.
 *
 * Returning a primitive (boolean / string / undefined) keeps the strict
 * equality check in `diffStructuralConfigs` cheap and deterministic.
 */
function normalizeStructuralValue(key: StructuralConfigKey, value: unknown): unknown {
  if (key === "handprintVariant") {
    if (value === null || value === undefined) return undefined
    if (value === "hp" || value === "hr") return value
    return undefined
  }
  // All other structural keys are boolean.
  return Boolean(value)
}

// =============================================================================
// ACTIVE VIEW STEPS (per config)
// =============================================================================

/**
 * Returns the set of `ViewStepId` that are visible (non-inactive) for the given config.
 * Built on top of `getViewStepDefinitions` so we stay consistent with the rendering layer.
 */
export function getActiveViewStepIds(config: CollectionConfig): ViewStepId[] {
  return getViewStepDefinitions(configToViewStepsInput(config))
    .filter((d) => !d.inactive)
    .map((d) => d.id as ViewStepId)
}

export interface ViewStepDiff {
  /** Steps that were visible in `oldConfig` and are now inactive. Their artefacts must be purged. */
  removed: ViewStepId[]
  /** Steps that were inactive in `oldConfig` and are now visible. They start as `upcoming`. */
  added: ViewStepId[]
  /** Steps active in both configs. Their existing `step_statuses` entry is preserved. */
  survived: ViewStepId[]
}

export function diffViewSteps(
  oldConfig: CollectionConfig,
  newConfig: CollectionConfig
): ViewStepDiff {
  const before = new Set(getActiveViewStepIds(oldConfig))
  const after = new Set(getActiveViewStepIds(newConfig))
  const removed: ViewStepId[] = []
  const added: ViewStepId[] = []
  const survived: ViewStepId[] = []
  for (const id of before) {
    if (after.has(id)) survived.push(id)
    else removed.push(id)
  }
  for (const id of after) {
    if (!before.has(id)) added.push(id)
  }
  return { removed, added, survived }
}

// =============================================================================
// STEP STATUSES MIGRATION (plan §8)
//
// Rule of preservation:
//   • Survivors keep their stage/health unchanged.
//   • Removed step ids are dropped (purge — plan §5).
//   • Added step ids stay implicit (no entry = upcoming/locked at render time).
// =============================================================================

export interface StepStatusesMigrationResult {
  /** New `collections.step_statuses` JSONB. */
  stepStatuses: StepStatuses
  /** New `collections.completion_percentage` (0..100). */
  completionPercentage: number
  /** Steps that survived AND were `done` before — these are the preserved-progress count. */
  preservedDoneStepIds: ViewStepId[]
  /** Steps whose entry was dropped because they are now inactive. */
  droppedStepIds: ViewStepId[]
}

/**
 * Apply the structural reconciliation rules over `prevStepStatuses`:
 *   • drop entries for steps that are now inactive
 *   • keep entries for survivors
 *   • recompute `completion_percentage` against the *new* visible-step denominator
 */
export function migrateStepStatusesForStructuralChange(
  prevStepStatuses: StepStatuses | undefined,
  oldConfig: CollectionConfig,
  newConfig: CollectionConfig
): StepStatusesMigrationResult {
  const prev = prevStepStatuses ?? {}
  const diff = diffViewSteps(oldConfig, newConfig)
  const newActive = new Set(getActiveViewStepIds(newConfig))

  const next: StepStatuses = {}
  const preservedDoneStepIds: ViewStepId[] = []
  const droppedStepIds: ViewStepId[] = [...diff.removed]

  for (const [stepId, entry] of Object.entries(prev)) {
    if (!newActive.has(stepId as ViewStepId)) {
      // Either explicitly removed or never visible; do not preserve.
      continue
    }
    next[stepId] = entry
    if ((entry as { stage?: StepStage }).stage === "done") {
      preservedDoneStepIds.push(stepId as ViewStepId)
    }
  }

  const denominator = newActive.size
  const numerator = preservedDoneStepIds.length
  const completionPercentage =
    denominator > 0 ? Math.round((numerator / denominator) * 100) : 0

  return {
    stepStatuses: next,
    completionPercentage,
    preservedDoneStepIds,
    droppedStepIds,
  }
}

// =============================================================================
// CREATION-TEMPLATE COMPLETED-BLOCK MIGRATION (plan §7)
// =============================================================================

/**
 * After applying `newConfig`, the Creation Template sidebar shape changes.
 * We must keep `creationData.completedBlockIds` consistent with the new template:
 *   • drop ids that no longer appear in the new template
 *   • drop ids whose content-completeness rules changed in a way that makes them
 *     newly invalid (e.g. `check_finals` rules change when toggling handprint or
 *     edition — see `isCreationStepContentComplete` in workflow.ts).
 *
 * Note: we cannot evaluate `isCreationStepContentComplete` here without the full
 * draft snapshot — that nuance is handled by the service which calls
 * `isCreationStepContentComplete` afterwards. This function only enforces the
 * topology (what ids are reachable from the new template).
 */
export function migrateCreationCompletedBlocks(
  prevCompletedBlockIds: CreationBlockId[] | undefined,
  newConfig: CollectionConfig
): CreationBlockId[] {
  const next = computeCreationTemplate(newConfig)
  const allowed = new Set<CreationBlockId>()
  for (const step of next) {
    allowed.add(step.stepId)
    for (const block of step.requiredBlocks) allowed.add(block)
  }
  const survivors: CreationBlockId[] = []
  for (const id of prevCompletedBlockIds ?? []) {
    if (allowed.has(id)) survivors.push(id)
  }
  return survivors
}

// =============================================================================
// PURGE SPEC FOR REMOVED VIEW STEPS (plan §5.1)
//
// Returns a structured description of *what to clear* per removed view step.
// The service consumes this to build a Supabase patch (config keys → DB columns
// + top-level Collection fields → JSONB arrays / *_uploaded_at / step notes).
//
// The mapping intentionally never names DB columns — we stay in domain shape;
// the mappers in `lib/utils/collection-mappers.ts` already know how to translate.
// =============================================================================

/** Config date+time fields cleared when a step is purged. */
type ConfigDeadlineFields = readonly (keyof CollectionConfig)[]

/** Top-level Collection fields cleared on purge (URL arrays / *UploadedAt / step notes). */
type CollectionTopLevelKey = keyof Collection

interface PurgeFieldsForStep {
  /** CollectionConfig date/time fields associated with this step (set to undefined → DB will null). */
  configDeadlineFields: ConfigDeadlineFields
  /** Top-level Collection fields to clear (string[] fields are cleared to [], *UploadedAt fields to undefined). */
  collectionUrlFields: CollectionTopLevelKey[]
  collectionUploadedAtFields: CollectionTopLevelKey[]
  collectionNoteFields: CollectionTopLevelKey[]
  /**
   * `notification_templates.step` value(s) that the notification cleanup uses to find
   * notifications/scheduled_notification_tracking rows to delete. Migrations 056/041
   * established a 1..11 step numbering; here we surface that mapping.
   */
  notificationTemplateSteps: number[]
}

const VIEW_STEP_PURGE_SPEC: Record<ViewStepId, PurgeFieldsForStep> = {
  shooting: {
    configDeadlineFields: [
      "shootingStartDate",
      "shootingStartTime",
      "shootingEndDate",
      "shootingEndTime",
      "shootingStreetAddress",
      "shootingZipCode",
      "shootingCity",
      "shootingCountry",
    ] as const,
    collectionUrlFields: [],
    collectionUploadedAtFields: [],
    collectionNoteFields: [],
    notificationTemplateSteps: [1],
  },
  negatives_dropoff: {
    configDeadlineFields: [
      "dropoff_shipping_origin_address",
      "dropoff_shipping_date",
      "dropoff_shipping_time",
      "dropoff_shipping_destination_address",
      "dropoff_delivery_date",
      "dropoff_delivery_time",
      "dropoff_managing_shipping",
      "dropoff_shipping_carrier",
      "dropoff_shipping_tracking",
      "dropoffAdditionalShipments",
    ] as const,
    collectionUrlFields: [],
    collectionUploadedAtFields: [],
    collectionNoteFields: [],
    notificationTemplateSteps: [2],
  },
  low_res_scanning: {
    configDeadlineFields: [
      "lowResScanDeadlineDate",
      "lowResScanDeadlineTime",
      "lowResShippingOriginAddress",
      "lowResShippingPickupDate",
      "lowResShippingPickupTime",
      "lowResShippingDestinationAddress",
      "lowResShippingDeliveryDate",
      "lowResShippingDeliveryTime",
      "lowResShippingManaging",
      "lowResShippingProvider",
      "lowResShippingTracking",
    ] as const,
    collectionUrlFields: ["lowResSelectionUrl"],
    collectionUploadedAtFields: ["lowResSelectionUploadedAt"],
    collectionNoteFields: ["stepNotesLowRes"],
    notificationTemplateSteps: [3],
  },
  photographer_selection: {
    configDeadlineFields: [
      "photoSelectionPhotographerDueDate",
      "photoSelectionPhotographerDueTime",
    ] as const,
    collectionUrlFields: ["photographerSelectionUrl"],
    collectionUploadedAtFields: ["photographerSelectionUploadedAt"],
    collectionNoteFields: ["stepNotesPhotographerSelection"],
    notificationTemplateSteps: [4],
  },
  client_selection: {
    configDeadlineFields: [
      "photoSelectionClientDueDate",
      "photoSelectionClientDueTime",
    ] as const,
    collectionUrlFields: ["clientSelectionUrl"],
    collectionUploadedAtFields: ["clientSelectionUploadedAt"],
    collectionNoteFields: ["stepNotesClientSelection"],
    notificationTemplateSteps: [5],
  },
  handprint_high_res: {
    configDeadlineFields: ["lrToHrDueDate", "lrToHrDueTime"] as const,
    collectionUrlFields: ["highResSelectionUrl"],
    collectionUploadedAtFields: ["highResSelectionUploadedAt"],
    collectionNoteFields: ["stepNotesHighRes"],
    notificationTemplateSteps: [7],
  },
  edition_request: {
    configDeadlineFields: [
      "editionPhotographerDueDate",
      "editionPhotographerDueTime",
    ] as const,
    collectionUrlFields: ["editionInstructionsUrl"],
    collectionUploadedAtFields: ["editionInstructionsUploadedAt"],
    collectionNoteFields: ["stepNotesEditionRequest"],
    notificationTemplateSteps: [8],
  },
  final_edits: {
    configDeadlineFields: [
      "editionStudioDueDate",
      "editionStudioDueTime",
    ] as const,
    collectionUrlFields: ["finalsSelectionUrl"],
    collectionUploadedAtFields: ["finalsSelectionUploadedAt"],
    collectionNoteFields: ["stepNotesFinalEdits"],
    notificationTemplateSteps: [9],
  },
  photographer_last_check: {
    configDeadlineFields: [
      "checkFinalsPhotographerDueDate",
      "checkFinalsPhotographerDueTime",
    ] as const,
    collectionUrlFields: ["photographerLastCheckUrl", "photographerApprovedMaterialUrls"],
    collectionUploadedAtFields: ["photographerLastCheckUploadedAt"],
    collectionNoteFields: ["stepNotesPhotographerLastCheck"],
    notificationTemplateSteps: [10],
  },
  client_confirmation: {
    configDeadlineFields: [
      "clientFinalsDeadline",
      "clientFinalsDeadlineTime",
      "checkFinalsClientDueDate",
      "checkFinalsClientDueTime",
    ] as const,
    collectionUrlFields: [],
    collectionUploadedAtFields: [],
    collectionNoteFields: ["stepNotesClientConfirmation"],
    notificationTemplateSteps: [11],
  },
}

export interface StepArtifactPurgePatch {
  /**
   * CollectionConfig date/address fields that should be cleared.
   * Adapter layer (collection-mappers.ts) cannot translate `undefined` into a DB
   * NULL because the mapper uses `!== undefined` as "skip"; therefore the
   * service routes these through raw admin SQL with the snake_case column
   * names exported by `STRUCTURAL_DEADLINE_DB_COLUMNS_BY_STEP` below.
   */
  configDeadlineFieldsToClear: (keyof CollectionConfig)[]
  /** Top-level URL array fields → empty arrays. Adapter-safe via repository.update patch. */
  urlFieldsToEmpty: CollectionTopLevelKey[]
  /** Top-level *UploadedAt fields → cleared. Adapter-safe (mapper widened to accept null). */
  uploadedAtFieldsToClear: CollectionTopLevelKey[]
  /** Top-level step notes JSONB fields → empty arrays. Adapter-safe. */
  noteFieldsToEmpty: CollectionTopLevelKey[]
  /** `notification_templates.step` numbers to use when scoping notif/scheduled cleanup. */
  notificationTemplateStepsToClean: number[]
  /** The view step ids that produced this purge. */
  removedViewStepIds: ViewStepId[]
}

/**
 * Build a structured purge patch from the view-step diff result.
 * The service applies it together with the migrated `step_statuses`.
 *
 * Survivor fields are *never* mentioned (caller is free to send only what changes).
 */
export function getStepArtifactPurgePatch(
  removedViewStepIds: ViewStepId[]
): StepArtifactPurgePatch {
  const configFields = new Set<keyof CollectionConfig>()
  const urlFieldsToEmpty = new Set<CollectionTopLevelKey>()
  const uploadedAtFieldsToClear = new Set<CollectionTopLevelKey>()
  const noteFieldsToEmpty = new Set<CollectionTopLevelKey>()
  const notificationTemplateStepsToClean = new Set<number>()

  for (const stepId of removedViewStepIds) {
    const spec = VIEW_STEP_PURGE_SPEC[stepId]
    if (!spec) continue
    for (const field of spec.configDeadlineFields) configFields.add(field)
    for (const field of spec.collectionUrlFields) urlFieldsToEmpty.add(field)
    for (const field of spec.collectionUploadedAtFields) uploadedAtFieldsToClear.add(field)
    for (const field of spec.collectionNoteFields) noteFieldsToEmpty.add(field)
    for (const stepNum of spec.notificationTemplateSteps) notificationTemplateStepsToClean.add(stepNum)
  }

  return {
    configDeadlineFieldsToClear: Array.from(configFields),
    urlFieldsToEmpty: Array.from(urlFieldsToEmpty),
    uploadedAtFieldsToClear: Array.from(uploadedAtFieldsToClear),
    noteFieldsToEmpty: Array.from(noteFieldsToEmpty),
    notificationTemplateStepsToClean: Array.from(notificationTemplateStepsToClean),
    removedViewStepIds: [...removedViewStepIds],
  }
}

// =============================================================================
// EVENT-TYPE → VIEW-STEP MAP (for collection_events cleanup, plan §5.1)
//
// Note: extends `EVENT_TYPE_TO_STEP_ID` (view-mode-steps.ts) with the
//       *_deadline_missed and *_shared / additional-materials variants that
//       are NOT used for view-mode progress derivation but ARE useful when
//       scoping the cleanup of obsolete notifications + scheduled tracking.
// =============================================================================

export const EVENT_TYPES_FOR_VIEW_STEP: Record<ViewStepId, readonly string[]> = {
  shooting: [
    "shooting_started",
    "shooting_ended",
    "shooting_completed_confirmed",
    "negatives_pickup_marked",
  ],
  negatives_dropoff: ["dropoff_confirmed", "dropoff_deadline_missed"],
  low_res_scanning: [
    "scanning_started",
    "scanning_completed",
    "scanning_deadline_missed",
    "lab_shared_additional_materials",
  ],
  photographer_selection: [
    "photographer_selection_uploaded",
    "photographer_selection_shared",
    "photographer_selection_deadline_missed",
    "photographer_requested_additional_photos",
  ],
  client_selection: [
    "client_selection_started",
    "client_selection_confirmed",
    "client_selection_shared",
    "client_selection_deadline_missed",
  ],
  handprint_high_res: ["highres_started", "highres_ready", "highres_deadline_missed"],
  edition_request: ["edition_request_submitted", "edition_request_deadline_missed"],
  final_edits: [
    "final_edits_started",
    "final_edits_completed",
    "final_edits_deadline_missed",
    "retouch_studio_shared_additional_materials",
  ],
  photographer_last_check: [
    "photographer_edits_approved",
    "photographer_last_check_shared_additional_materials",
    "photographer_review_deadline_missed",
  ],
  client_confirmation: ["client_confirmation_confirmed", "collection_completed"],
}

/** Flatten event_type strings for a set of removed view steps. */
export function getEventTypesToPurgeForRemovedSteps(
  removedViewStepIds: ViewStepId[]
): string[] {
  const out = new Set<string>()
  for (const stepId of removedViewStepIds) {
    for (const eventType of EVENT_TYPES_FOR_VIEW_STEP[stepId] ?? []) out.add(eventType)
  }
  return Array.from(out)
}

// =============================================================================
// PARTICIPANT VALIDATION (plan §6)
// =============================================================================

export interface ParticipantValidationResult {
  /** Roles required by the new config. */
  nowRequiredRoles: ParticipantRole[]
  /** Required roles that are not present (or incomplete) → publish is blocked. */
  missingRequiredRoles: ParticipantRole[]
  /** Previously-required roles that are no longer required (UI should offer cleanup). */
  orphanedRoles: ParticipantRole[]
}

/**
 * Validate participants against required roles after a structural change.
 * The "orphanedRoles" bucket is informational only — the service does NOT
 * auto-remove memberships; it surfaces them to UI for the producer to clean up
 * consciously (plan §6.1 MVP).
 */
export function validateParticipantsForConfig(
  participants: CollectionParticipant[],
  oldConfig: CollectionConfig,
  newConfig: CollectionConfig
): ParticipantValidationResult {
  const nowRequiredRoles = getRequiredParticipantRoles(newConfig)
  const prevRequiredRoles = getRequiredParticipantRoles(oldConfig)
  const presentRoles = new Set(participants.map((p) => p.role))

  const missingRequiredRoles: ParticipantRole[] = []
  for (const role of nowRequiredRoles) {
    if (!presentRoles.has(role)) {
      missingRequiredRoles.push(role)
      continue
    }
    // Light structural check (full content check stays in `isParticipantsStepComplete`):
    // roles needing an entityId must have one (client is exempt — handled elsewhere).
    if (role === "agency" || role === "photo_lab" || role === "handprint_lab" || role === "retouch_studio") {
      const p = participants.find((x) => x.role === role)
      if (!p?.entityId?.trim() || (p.userIds?.length ?? 0) === 0) {
        missingRequiredRoles.push(role)
      }
    }
  }

  const orphanedRoles: ParticipantRole[] = []
  for (const role of prevRequiredRoles) {
    if (!nowRequiredRoles.includes(role) && presentRoles.has(role)) {
      orphanedRoles.push(role)
    }
  }

  return { nowRequiredRoles, missingRequiredRoles, orphanedRoles }
}

// =============================================================================
// TERMINAL STATUS GUARD (plan §11 edge #6)
// =============================================================================

/** Statuses that are not allowed to undergo a structural reconfiguration. */
export const STRUCTURAL_CHANGE_BLOCKED_STATUSES = ["canceled", "completed"] as const

export function isStructuralChangeBlockedByStatus(
  status: Collection["status"]
): boolean {
  return (STRUCTURAL_CHANGE_BLOCKED_STATUSES as readonly string[]).includes(status)
}

// =============================================================================
// FULL RECONCILIATION RESULT
// =============================================================================

export interface StructuralReconciliationResult {
  /** Diff computed at the start of the pipeline. */
  diff: StructuralDiff
  /** View-step changes (visible→inactive and vice-versa). */
  viewStepDiff: ViewStepDiff
  /** New `step_statuses` map + completion percentage to persist. */
  stepStatuses: StepStatuses
  completionPercentage: number
  /** Reconciled `creationData.completedBlockIds`. */
  completedBlockIds: CreationBlockId[]
  /** Purge instructions for removed steps' artefacts. */
  purge: StepArtifactPurgePatch
  /** Participant validation against the new config. */
  participants: ParticipantValidationResult
  /** True when the result is structural (non-empty diff). When false the service must not enter the pipeline. */
  isStructural: boolean
}

/**
 * One-shot deterministic reconciliation: takes the previous Collection and a new
 * config and returns *everything* the service needs to apply. The service is
 * responsible for:
 *   1. wrapping the patch in a single DB transaction
 *   2. clearing `published_at` + setting status to "draft" when the prior
 *      Collection was published
 *   3. incrementing `workflow_revision`
 *   4. triggering the in-app notification (see §17)
 *   5. running the scoped notification cleanup using
 *      `purge.notificationTemplateStepsToClean`
 */
export function reconcileStructuralChange(
  prevCollection: Pick<
    Collection,
    "config" | "participants" | "creationData" | "stepStatuses"
  >,
  newConfig: CollectionConfig
): StructuralReconciliationResult {
  const diff = diffStructuralConfigs(prevCollection.config, newConfig)
  const viewStepDiff = diffViewSteps(prevCollection.config, newConfig)
  const stepStatusesResult = migrateStepStatusesForStructuralChange(
    // Collection.stepStatuses is widened to `Record<string, { stage: string; ... }>`
    // at the domain edge to accommodate legacy/lax DB shapes (e.g. when a row
    // pre-dates the StepStage union). Casting here is safe: the migration only
    // *filters* and *recomputes* counts; non-conforming entries simply pass
    // through unchanged and continue to be valid for downstream consumers.
    prevCollection.stepStatuses as StepStatuses | undefined,
    prevCollection.config,
    newConfig
  )
  const completedBlockIds = migrateCreationCompletedBlocks(
    prevCollection.creationData?.completedBlockIds,
    newConfig
  )
  const purge = getStepArtifactPurgePatch(viewStepDiff.removed)
  const participants = validateParticipantsForConfig(
    prevCollection.participants ?? [],
    prevCollection.config,
    newConfig
  )

  return {
    diff,
    viewStepDiff,
    stepStatuses: stepStatusesResult.stepStatuses,
    completionPercentage: stepStatusesResult.completionPercentage,
    completedBlockIds,
    purge,
    participants,
    isStructural: diff.isStructural,
  }
}
