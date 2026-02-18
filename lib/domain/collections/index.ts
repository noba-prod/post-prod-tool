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
} from "./types"

export {
  CREATION_BLOCK_IDS,
  PARTICIPANT_ROLES,
  STEP_IDS,
} from "./types"

// Workflow (pure functions)
export {
  canUserEditStep,
  computeCreationTemplate,
  derivePublishedStatus,
  deriveCanonicalCollectionStatus,
  getChronologyConstraints,
  getInitialSubstatus,
  getNextSubstatus,
  getStepOwner,
  isCreationStepComplete,
  isCreationStepContentComplete,
  isDraftComplete,
  isParticipantsStepComplete,
  isValidSubstatusTransition,
  resolveUserForPermission,
} from "./workflow"

export type { ChronologyConstraint, ChronologyConstraintsResult } from "./workflow"

// Repository interface only
export type {
  CollectionUpdatePatch,
  ICollectionsRepository,
  ListCollectionsFilters,
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

// Step health computation (per-step stage + health labels)
export {
  computeStepHealth,
  computeStepStatuses,
  deriveCompletedStepIds,
  buildEventCreatedAtMap,
  getDeadlineForStep,
} from "./step-health"
export type {
  StepStage,
  StepHealth,
  StepStatusEntry,
  StepStatuses,
} from "./step-health"
