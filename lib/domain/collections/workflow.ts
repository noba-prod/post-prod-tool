/**
 * Pure workflow functions for Collections.
 * Source of truth: noba-poc/docs/context/collections-logic.md + PHOTO scenario matrix.
 * No side effects. No UI. No I/O.
 */

import type {
  CollectionConfig,
  CreationBlockId,
  CollectionDraft,
  CreationTemplateStep,
  ParticipantRole,
  StepId,
  UserForPermission,
} from "./types"

// =============================================================================
// SCENARIO MATRIX (PHOTO — Collection config → Sidebar steps)
// Config fields: hasLowResLab (digital), hasHandprint, hasEditionStudio, hasAgency, handprintIsDifferentLab.
// Modal: Digital => hasLowResLab=true, hasHandprint=false; Handprint => hasHandprint=true, hasLowResLab=false.
// =============================================================================
//
// | Scenario                         | Digital | Handprint | hasEditionStudio | handprintDiffLab | Green steps (ordered) |
// |----------------------------------|---------|-----------|------------------|------------------|------------------------|
// | 1 Digital Only                   | ✓       | ✗         | Off              | -                | Participants, Shooting setup, Photo selection, LR to HR setup, Check Finals |
// | 2 Digital + Photographer Edition | ✓       | ✗         | On               | -                | + Pre-check & Edition before Check Finals |
// | 3 Handprint Only                 | ✗       | ✓         | Off              | Off              | Participants, Shooting setup, Drop-off plan, Low-res scan, Photo selection, LR to HR setup, Check Finals |
// | 4 Handprint + Edition            | ✗       | ✓         | On               | Off              | + Pre-check & Edition before Check Finals |
// | 5 Handprint + Different Lab      | ✗       | ✓         | Off              | On               | Same as 3 (Pre-check grey) |
// | 6 Handprint + Edition + DiffLab | ✗       | ✓         | On               | On               | Same as 4 |
//
// StepId → UI label (STEP_LABELS in UI): participants, shooting_setup, dropoff_plan, low_res_config,
//   photo_selection, lr_to_hr_setup, handprint_high_res_config, edition_config, check_finals.
// =============================================================================

// =============================================================================
// COMPUTE CREATION TEMPLATE (collections-logic §3.2, §4 + PHOTO matrix)
// Returns ordered steps for the Creation Template sidebar. Each step has requiredBlocks
// so the main area can render the correct blocks. Derivation is deterministic from config.
// =============================================================================

export function computeCreationTemplate(
  config: CollectionConfig
): CreationTemplateStep[] {
  const steps: CreationTemplateStep[] = []
  const producer: ParticipantRole = "producer"

  // 1. Participants — always first (collections-logic §4.1)
  steps.push({
    stepId: "participants",
    requiredBlocks: ["participants"],
    ownerRoles: [producer],
    mandatory: true,
  })

  // 2. Shooting setup — always second (PHOTO: every scenario)
  steps.push({
    stepId: "shooting_setup",
    requiredBlocks: ["shooting_setup"],
    ownerRoles: [producer],
    mandatory: true,
  })

  // 3. Drop-off plan — only if Handprint (PHOTO: grey in Digital)
  if (config.hasHandprint) {
    steps.push({
      stepId: "dropoff_plan",
      requiredBlocks: ["dropoff_plan"],
      ownerRoles: [producer],
      mandatory: true,
    })
  }

  // 4. Low-res scan — only if Handprint (PHOTO: grey in Digital)
  if (config.hasHandprint) {
    steps.push({
      stepId: "low_res_config",
      requiredBlocks: ["low_res_config"],
      ownerRoles: ["lab", producer],
      mandatory: true,
    })
  }

  // 5. Photo selection — always (PHOTO: one step; requiredBlocks = photographer + client config)
  steps.push({
    stepId: "photo_selection",
    requiredBlocks: ["photographer_selection_config", "client_selection_config"],
    ownerRoles: config.hasAgency
      ? (["photographer", "agency", "client", producer] as ParticipantRole[])
      : (["photographer", "client", producer] as ParticipantRole[]),
    mandatory: true,
  })

  // 6. LR to HR setup — digital path uses lr_to_hr_setup; handprint uses handprint_high_res_config
  if (config.hasHandprint) {
    steps.push({
      stepId: "handprint_high_res_config",
      requiredBlocks: ["handprint_high_res_config"],
      ownerRoles: config.handprintIsDifferentLab
        ? (["handprint_lab", producer] as ParticipantRole[])
        : (["lab", producer] as ParticipantRole[]),
      mandatory: true,
    })
  } else {
    steps.push({
      stepId: "lr_to_hr_setup",
      requiredBlocks: ["lr_to_hr_setup"],
      ownerRoles: ["lab", producer],
      mandatory: true,
    })
  }

  // 7. Pre-check & Edition — only if Photographer request edition (hasEditionStudio)
  if (config.hasEditionStudio) {
    steps.push({
      stepId: "edition_config",
      requiredBlocks: ["edition_config"],
      ownerRoles: ["edition_studio", producer],
      mandatory: true,
    })
  }

  // 8. Check Finals — always last (collections-logic §5.1)
  steps.push({
    stepId: "check_finals",
    requiredBlocks: ["check_finals"],
    ownerRoles: [producer],
    mandatory: true,
  })

  return steps
}

// =============================================================================
// IS CREATION STEP COMPLETE — For UI "completed" state and sidebar highlighting
// A step is complete when every requiredBlock is in completedBlockIds.
// =============================================================================

export function isCreationStepComplete(
  step: CreationTemplateStep,
  completedBlockIds: CreationBlockId[]
): boolean {
  const set = new Set(completedBlockIds)
  return step.requiredBlocks.every((b) => set.has(b))
}

// =============================================================================
// IS DRAFT COMPLETE (collections-logic §5.1)
// True only if all required participants and all required config blocks are done.
// =============================================================================

export function isDraftComplete(draft: CollectionDraft): boolean {
  const templateSteps = computeCreationTemplate(draft.config)
  const completed = new Set(draft.creationData.completedBlockIds)

  // Every mandatory creation step must have its required blocks completed
  for (const step of templateSteps) {
    if (!step.mandatory) continue
    for (const blockId of step.requiredBlocks) {
      if (!completed.has(blockId)) return false
    }
  }

  // Required participants: derived from config (collections-logic §4.1)
  const requiredRoles = getRequiredParticipantRoles(draft.config)
  const presentRoles = new Set(
    draft.participants.map((p) => p.role).filter(Boolean)
  )
  for (const role of requiredRoles) {
    if (!presentRoles.has(role)) return false
  }

  // Each required participant must have at least one entity/user assigned
  for (const role of requiredRoles) {
    const p = draft.participants.find((x) => x.role === role)
    if (!p?.entityId) return false
  }

  return true
}

function getRequiredParticipantRoles(config: CollectionConfig): ParticipantRole[] {
  const roles: ParticipantRole[] = ["producer", "client", "photographer"]
  // Agency is selected via Photographer's "Select agency" — no separate agency section/role (collections-logic)
  // Lab only in handprint workflow; digital-only has no lab (collections-logic)
  if (config.hasHandprint) roles.push("lab")
  // Handprint lab required only when it is a different lab than low-res (collections-logic)
  if (config.hasHandprint && config.handprintIsDifferentLab) roles.push("handprint_lab")
  if (config.hasEditionStudio) roles.push("edition_studio")
  return roles
}

// =============================================================================
// IS PARTICIPANTS STEP COMPLETE (collections-logic §4 — Participants block)
// True when all required participant entities are set and member rules hold.
// Used to toggle "participants" in completedBlockIds.
// =============================================================================

export function isParticipantsStepComplete(draft: CollectionDraft): boolean {
  const config = draft.config
  const requiredRoles = getRequiredParticipantRoles(config)
  const participants = draft.participants

  const getParticipant = (role: ParticipantRole) =>
    participants.find((p) => p.role === role)
  const hasEntityId = (role: ParticipantRole) => {
    if (role === "client") {
      const p = getParticipant("client")
      return (p?.entityId ?? config.clientEntityId)?.trim().length > 0
    }
    const p = getParticipant(role)
    return (p?.entityId ?? "").trim().length > 0
  }

  for (const role of requiredRoles) {
    if (!hasEntityId(role)) return false
  }

  const photographer = getParticipant("photographer")
  const photographerUserIds = photographer?.userIds ?? []

  if (!config.hasAgency) {
    if (photographerUserIds.length !== 1) return false
    const edit = photographer?.editPermissionByUserId?.[photographerUserIds[0]]
    if (edit !== true) return false
  } else {
    // When hasAgency, agency is chosen via Photographer's "Select agency" — photographer holds that entityId
    if (!(photographer?.entityId?.trim())) return false
    if (photographerUserIds.length < 1) return false
  }

  return true
}

// =============================================================================
// GET STEP OWNER (collections-logic §9, §10)
// Producer is ALWAYS included. Returns roles that own the step.
// =============================================================================

export function getStepOwner(
  stepId: StepId,
  draft: CollectionDraft
): ParticipantRole[] {
  const config = draft.config
  const producer: ParticipantRole = "producer"

  switch (stepId) {
    case "shooting":
      return [producer]
    case "negatives_dropoff":
      return ["lab", producer]
    case "low_res_scanning":
      return ["lab", producer]
    case "photographer_selection":
      return ["photographer", producer]
    case "client_selection":
      return ["client", producer]
    case "handprint_high_res":
      return config.handprintIsDifferentLab
        ? (["handprint_lab", producer] as ParticipantRole[])
        : (["lab", producer] as ParticipantRole[])
    case "edition_request":
      return ["photographer", producer]
    case "final_edits":
      return ["edition_studio", producer]
    case "photographer_last_check":
      return ["photographer", producer]
    case "client_confirmation":
      return ["client", producer]
    default: {
      const _: never = stepId
      return [producer]
    }
  }
}

// =============================================================================
// CAN USER EDIT STEP (collections-logic §8, §9)
// Producer can always edit. Otherwise: role must be owner and hasEditPermission.
// =============================================================================

export function canUserEditStep(
  user: UserForPermission,
  stepId: StepId,
  draft: CollectionDraft
): boolean {
  if (user.role === "producer") return true
  const owners = getStepOwner(stepId, draft)
  if (!owners.includes(user.role)) return false
  return user.hasEditPermission
}
