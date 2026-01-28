/**
 * Collections domain — contracts and workflow engine.
 * Source of truth: noba-poc/docs/context/collections-logic.md
 * No UI. No React. No database. Pure domain.
 */

// Types
export type {
  CollectionConfig,
  CollectionDraft,
  CollectionDraftStatus,
  CollectionParticipant,
  CreationBlockId,
  CreationData,
  CreationTemplateStep,
  ParticipantRole,
  StepId,
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
  getChronologyConstraints,
  getStepOwner,
  isCreationStepComplete,
  isDraftComplete,
  isParticipantsStepComplete,
} from "./workflow"

export type { ChronologyConstraint, ChronologyConstraintsResult } from "./workflow"

// Repository interface only
export type {
  CollectionDraftPatch,
  ICollectionsRepository,
} from "./repository.interface"
