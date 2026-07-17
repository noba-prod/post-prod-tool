/**
 * Collections domain — contracts and workflow engine.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 * No UI. No React. No database. Pure domain.
 */

// Types
export type {
  Collection,
  CollectionConfig,
  CollectionDraft,
  CollectionDraftStatus,
  CollectionStatus,
  CollectionSubstatus,
  CollectionParticipant,
  CreationBlockId,
  CreationData,
  CreationTemplateStep,
  ParticipantRole,
  CurrentOwnerRole,
  StepId,
  StepNoteEntry,
  UserForPermission,
  DropoffAdditionalShipment,
} from "./types"

export {
  CREATION_BLOCK_IDS,
  PARTICIPANT_ROLES,
  STEP_IDS,
} from "./types"

// Workflow (pure functions)
export {
  canUserEditStep,
  canUserViewStepUrlHistory,
  computeCreationTemplate,
  derivePublishedStatus,
  deriveCanonicalCollectionStatus,
  getChronologyConstraints,
  getInitialSubstatus,
  getNextSubstatus,
  getRequiredParticipantRoles,
  isParticipantRoleRequired,
  stripOrphanedParticipants,
  getStepOwner,
  isCreationStepComplete,
  isCreationStepContentComplete,
  isDraftComplete,
  isParticipantsStepComplete,
  isValidSubstatusTransition,
  resolveUserForPermission,
  canUseNobaSensitiveCollectionSidebarActions,
} from "./workflow"

export type { ChronologyConstraint, ChronologyConstraintsResult } from "./workflow"

export {
  STEP_LINK_MUTATION_CONFIG,
  getStepLinkMutationConfig,
} from "./step-link-config"
export type { StepLinkMutationConfig } from "./step-link-config"

// Structural workflow reconfiguration (post-create / post-publish)
export {
  STRUCTURAL_CONFIG_KEYS,
  STRUCTURAL_KEYS_DB_COLUMNS,
  STRUCTURAL_CHANGE_BLOCKED_STATUSES,
  EVENT_TYPES_FOR_VIEW_STEP,
  diffStructuralConfigs,
  diffViewSteps,
  getActiveViewStepIds,
  getEventTypesToPurgeForRemovedSteps,
  getStepArtifactPurgePatch,
  isStructuralChangeBlockedByStatus,
  migrateCreationCompletedBlocks,
  migrateStepStatusesForStructuralChange,
  reconcileStructuralChange,
  validateParticipantsForConfig,
} from "./structural-workflow-change"
export type {
  ParticipantValidationResult,
  StepArtifactPurgePatch,
  StepStatusesMigrationResult,
  StructuralConfigKey,
  StructuralDiff,
  StructuralReconciliationResult,
  ViewStepDiff,
} from "./structural-workflow-change"

// Repository interface only
export type {
  CollectionUpdatePatch,
  ICollectionsRepository,
  ListCollectionsFilters,
  ListCollectionsPageOptions,
  ListCollectionsPageResult,
} from "./repository.interface"

// Stage status from shooting start (so changing dates after publish updates UI)
export {
  deriveStageStatusFromShootingStart,
} from "./stage-status"
export type { StageStatusDisplay, ShootingStartConfig } from "./stage-status"

// View mode steps (canonical list + derivation from config; reusable for demo and collection view page)
export {
  configToViewStepsInput,
  EVENT_TYPE_TO_STEP_ID,
  formatDeadlineDate,
  getViewStepDefinitions,
  viewStepsWithStatus,
  viewStepsWithStatusFromCollection,
  VIEW_STEP_IDS,
} from "./view-mode-steps"
export type {
  ViewStepId,
  ViewStepDefinition,
  ViewStepsConfigInput,
  ViewStepStatus,
  ViewStepsFromCollectionOptions,
} from "./view-mode-steps"

export {
  canShowPhotographerLastCheckExtraLinks,
  canCompleteClientConfirmation,
  getClientConfirmationBannerCopy,
  getClientConfirmationLastCheckUrls,
  getClientConfirmationLinkTitle,
  getClientConfirmationMaterialUrls,
  isClientConfirmationStepReady,
} from "./client-confirmation-visibility"
export type {
  ClientConfirmationMaterialVisibilityInput,
  ClientConfirmationStepLike,
} from "./client-confirmation-visibility"

export {
  COLLECTION_TYPE_FILTER_OPTIONS,
  collectionMatchesShootingTypeFilter,
  getCollectionShootingType,
} from "./collection-shooting-type"
export type { CollectionShootingType } from "./collection-shooting-type"

export {
  dedupeDropoffAdditionalShipments,
  dropoffShipmentIdentityKey,
  getDropoffShipmentsForDisplay,
  hasDropoffShipmentData,
  isDuplicateDropoffShipment,
  stripPrimaryFromDropoffAdditionalShipments,
} from "./dropoff-shipments"
export type { DropoffShipmentsForDisplayInput } from "./dropoff-shipments"

// Step health computation (per-step stage + health labels)
export {
  computeStepHealth,
  computeStepStatuses,
  deriveCompletedStepIds,
  deriveActiveStepHealth,
  buildEventCreatedAtMap,
  getDeadlineForStep,
} from "./step-health"
export type {
  StepStage,
  StepHealth,
  StepStatusEntry,
  StepStatuses,
} from "./step-health"
