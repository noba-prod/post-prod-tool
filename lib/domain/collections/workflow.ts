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
  CollectionDraftStatus,
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
// DERIVE PUBLISHED STATUS (HITO 4)
// Determines collection status after publish based on shooting date vs now.
// If shootingDate exists AND is in the past → "in_progress", else → "upcoming".
// =============================================================================

/**
 * Derives the published status for a collection based on shooting date.
 * @param config Collection configuration
 * @param now Current date/time (defaults to new Date())
 * @returns "upcoming" if shooting date is missing or in the future, "in_progress" if in the past
 */
export function derivePublishedStatus(
  config: CollectionConfig,
  now: Date = new Date()
): "upcoming" | "in_progress" {
  // Use shootingDate (key date) if available, fallback to shootingStartDate
  const shootingDateStr = config.shootingDate ?? config.shootingStartDate
  if (!shootingDateStr?.trim()) {
    return "upcoming"
  }

  // Parse date string (YYYY-MM-DD format)
  const shootingDate = new Date(shootingDateStr + "T12:00:00")
  if (Number.isNaN(shootingDate.getTime())) {
    return "upcoming"
  }

  // Compare dates (ignore time, compare date-only)
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const shootingDateOnly = new Date(
    shootingDate.getFullYear(),
    shootingDate.getMonth(),
    shootingDate.getDate()
  )

  return shootingDateOnly <= nowDateOnly ? "in_progress" : "upcoming"
}

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
  // (Hand print: photographer check client selection form is inside this block, not a separate step)
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
      // Digital workflow: photographer converts LR → HR and delivers HR to the client.
      ownerRoles: ["photographer", producer],
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
// A step is complete when the user marked it done (stepId in completedBlockIds)
// or when every requiredBlock is in completedBlockIds (e.g. steps whose UI is a single block).
// =============================================================================

export function isCreationStepComplete(
  step: CreationTemplateStep,
  completedBlockIds: CreationBlockId[]
): boolean {
  const set = new Set(completedBlockIds)
  if (set.has(step.stepId)) return true
  return step.requiredBlocks.every((b) => set.has(b))
}

// =============================================================================
// IS DRAFT COMPLETE (collections-logic §5.1)
// True when all mandatory info is done so Publish can be enabled.
// - All steps before "Check Finals" must be completed (user clicked Next).
// - Check Finals is the last step; we don't require it in completedBlockIds
//   (user reaches it by completing previous steps; Publish opens the dialog).
// - Shipping details (Responsible for shipping, Provider, Tracking) are nice-to-have
//   and do not block completion; only step completion and participants are required.
// =============================================================================

export function isDraftComplete(draft: CollectionDraft): boolean {
  const templateSteps = computeCreationTemplate(draft.config)
  const completed = new Set(draft.creationData.completedBlockIds)
  const lastStepId =
    templateSteps.length > 0
      ? templateSteps[templateSteps.length - 1].stepId
      : null

  // Every mandatory step except the last (Check Finals) must be completed
  for (const step of templateSteps) {
    if (!step.mandatory) continue
    // Last step: user is on Check Finals; we don't require it in completedBlockIds to enable Publish
    if (step.stepId === lastStepId && lastStepId === "check_finals") continue
    const stepDone =
      completed.has(step.stepId) ||
      step.requiredBlocks.every((b) => completed.has(b))
    if (!stepDone) return false
  }

  // Required participants: derived from config (collections-logic §4.1)
  const requiredRoles = getRequiredParticipantRoles(draft.config)
  const presentRoles = new Set(
    draft.participants.map((p) => p.role).filter(Boolean)
  )
  for (const role of requiredRoles) {
    if (!presentRoles.has(role)) return false
  }

  // Each required participant must satisfy same rules as isParticipantsStepComplete
  // (entity where applicable, users where applicable, at least one user with edit permission)
  if (!isParticipantsStepComplete(draft)) return false

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
// PARTICIPANT HAS EDIT PERMISSION — At least one user with edit permission
// =============================================================================

function hasAtLeastOneUserWithEditPermission(
  p: { userIds?: string[]; editPermissionByUserId?: Record<string, boolean> } | undefined
): boolean {
  if (!p?.userIds?.length) return false
  const editBy = p.editPermissionByUserId ?? {}
  return p.userIds.some((id) => editBy[id] === true)
}

// =============================================================================
// IS PARTICIPANTS STEP COMPLETE (collections-logic §4 — Participants block)
// True when all required participant entities are set, each has at least one user,
// and each has at least one user with edit permission. Used to toggle "participants"
// in completedBlockIds and to enable/disable Next.
// =============================================================================

export function isParticipantsStepComplete(draft: CollectionDraft): boolean {
  const config = draft.config
  const requiredRoles = getRequiredParticipantRoles(config)
  const participants = draft.participants

  const getParticipant = (role: ParticipantRole) =>
    participants.find((p) => p.role === role)

  // Check if a role has the required data (entity where applicable + users + at least one with edit permission)
  const isRoleFilled = (role: ParticipantRole): boolean => {
    const p = getParticipant(role)

    // Producer: at least one user and at least one with edit permission
    if (role === "producer") {
      return (p?.userIds?.length ?? 0) > 0 && hasAtLeastOneUserWithEditPermission(p)
    }

    // Client: entity only (no user/edit-permission requirement)
    if (role === "client") {
      return ((p?.entityId ?? config.clientEntityId) ?? "").trim().length > 0
    }

    // Lab, handprint_lab, edition_studio: entityId + at least one user with edit permission
    if (role === "lab" || role === "handprint_lab" || role === "edition_studio") {
      if (!(p?.entityId ?? "").trim()) return false
      return (p?.userIds?.length ?? 0) > 0 && hasAtLeastOneUserWithEditPermission(p)
    }

    // Photographer: handled below with extra rules
    if (role === "photographer") {
      if (!config.hasAgency) {
        return (p?.userIds?.length ?? 0) > 0 && hasAtLeastOneUserWithEditPermission(p)
      }
      return (
        !!(p?.entityId ?? "").trim() &&
        (p?.userIds?.length ?? 0) > 0 &&
        hasAtLeastOneUserWithEditPermission(p)
      )
    }

    return (p?.entityId ?? "").trim().length > 0
  }

  // Check all required roles are filled (including users + edit permission where applicable)
  for (const role of requiredRoles) {
    if (!isRoleFilled(role)) return false
  }

  return true
}

// =============================================================================
// IS CREATION STEP CONTENT COMPLETE (minimal required info per step)
// Used to enable/disable the "Next" button: user cannot advance until step minimum is met.
// =============================================================================

export function isCreationStepContentComplete(
  draft: CollectionDraft,
  stepId: CreationBlockId
): boolean {
  const c = draft.config

  switch (stepId) {
    case "participants":
      return isParticipantsStepComplete(draft)

    case "shooting_setup": {
      const hasStart = !!c.shootingStartDate?.trim()
      const hasEnd = !!c.shootingEndDate?.trim()
      const hasLocation = !!c.shootingCity?.trim() || !!c.shootingCountry?.trim()
      return hasStart && hasEnd && hasLocation
    }

    case "dropoff_plan": {
      const hasShippingDate = !!c.dropoff_shipping_date?.trim()
      const hasDeliveryDate = !!c.dropoff_delivery_date?.trim()
      return hasShippingDate && hasDeliveryDate
    }

    case "low_res_config": {
      return !!c.lowResScanDeadlineDate?.trim()
    }

    case "photographer_selection_config":
    case "client_selection_config":
      // Photo selection step has two blocks; we validate the whole step in photo_selection
      return true

    case "photo_selection": {
      const hasPhotographerDue = !!c.photoSelectionPhotographerDueDate?.trim()
      const hasClientDue = !!c.photoSelectionClientDueDate?.trim()
      return hasPhotographerDue && hasClientDue
    }

    case "lr_to_hr_setup":
      return !!c.lrToHrDueDate?.trim()
    case "handprint_high_res_config": {
      // Hand print: block includes photographer check form + LR to HR form; both required
      const hasPhotographerCheck =
        !!c.photographerCheckDueDate?.trim() && !!c.photographerCheckDueTime?.trim()
      const hasLrToHr = !!c.lrToHrDueDate?.trim()
      return hasPhotographerCheck && hasLrToHr
    }

    case "edition_config": {
      const hasPhotographerDue = !!c.editionPhotographerDueDate?.trim()
      const hasStudioDue = !!c.editionStudioDueDate?.trim()
      return hasPhotographerDue && hasStudioDue
    }

    case "check_finals": {
      // Check Finals: Photographer check finals (Date + Time) and Client approve finals (Date + Time).
      // When digital + no edition studio, photographer check is redundant (they check at LR to HR time); only client deadline required.
      const isPhotographerCheckRedundant = !c.hasHandprint && !c.hasEditionStudio
      const hasClientDeadline = !!c.clientFinalsDeadline?.trim()
      const hasClientDeadlineTime = !!c.clientFinalsDeadlineTime?.trim()
      if (isPhotographerCheckRedundant) {
        return hasClientDeadline && hasClientDeadlineTime
      }
      const hasPhotographerDate = !!c.checkFinalsPhotographerDueDate?.trim()
      const hasPhotographerTime = !!c.checkFinalsPhotographerDueTime?.trim()
      return (
        hasPhotographerDate &&
        hasPhotographerTime &&
        hasClientDeadline &&
        hasClientDeadlineTime
      )
    }

    default:
      return true
  }
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
    case "photographer_check_client_selection":
      return ["photographer", producer]
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

// =============================================================================
// RESOLVE CURRENT USER FOR PERMISSION (collections-logic §8, §9)
// Builds UserForPermission from collection participants/config and whether user is internal (noba).
// =============================================================================

export function resolveUserForPermission(
  userId: string,
  isInternal: boolean,
  draft: CollectionDraft
): UserForPermission {
  if (isInternal) {
    const hasEdit =
      draft.config.nobaEditPermissionByUserId?.[userId] ?? true
    return { role: "producer", hasEditPermission: hasEdit }
  }
  for (const p of draft.participants) {
    if (p.userIds?.includes(userId)) {
      const hasEdit = p.editPermissionByUserId?.[userId] ?? false
      return { role: p.role, hasEditPermission: hasEdit }
    }
  }
  return { role: "client", hasEditPermission: false }
}

// =============================================================================
// CHRONOLOGY CONSTRAINTS — Creation Template date/time pickers (linear flow)
// Dates/times must never go backwards. Uses derived steps order from config.
// =============================================================================

export interface ChronologyConstraint {
  /** Minimum selectable date (ISO date string or Date); dates before this are disabled */
  minDate?: string
  /** Suggested default date when current is empty (prefill from previous step) */
  defaultDate?: string
  /** When same day as previous: do not allow time before previous time */
  minTimePolicy?: "none" | "sameDayNotBeforePreviousTime"
  /** Previous step's time preset for same-day default */
  previousTimePreset?: string
  /** Whether this date/time control is enabled (false when previous step has no date) */
  isEnabled: boolean
  /** Reason when disabled (not shown in UI; kept for future use) */
  reason?: string
}

export interface ChronologyConstraintsResult {
  byBlockId: Record<string, ChronologyConstraint>
  /** Optional patch to auto-correct downstream values that became invalid after earlier step change */
  suggestedCorrection?: Partial<CollectionConfig>
}

type ConfigKey = keyof CollectionConfig

/** Ordered date-bearing slots: constraintKey, config date key, config time key. Only steps that render date pickers. */
function getOrderedDateSlots(
  steps: CreationTemplateStep[]
): { key: string; dateKey: ConfigKey; timeKey?: ConfigKey }[] {
  const slots: { key: string; dateKey: ConfigKey; timeKey?: ConfigKey }[] = []
  for (const step of steps) {
    switch (step.stepId) {
      case "shooting_setup":
        slots.push({
          key: "shooting_setup",
          dateKey: "shootingStartDate",
          timeKey: "shootingStartTime",
        })
        slots.push({
          key: "shooting_setup_ending",
          dateKey: "shootingEndDate",
          timeKey: "shootingEndTime",
        })
        break
      case "dropoff_plan":
        slots.push({
          key: "dropoff_plan_shipping",
          dateKey: "dropoff_shipping_date",
          timeKey: "dropoff_shipping_time",
        })
        slots.push({
          key: "dropoff_plan_delivery",
          dateKey: "dropoff_delivery_date",
          timeKey: "dropoff_delivery_time",
        })
        break
      case "low_res_config":
        slots.push({
          key: "low_res_config",
          dateKey: "lowResScanDeadlineDate",
          timeKey: "lowResScanDeadlineTime",
        })
        break
      case "photo_selection":
        slots.push({
          key: "photo_selection_photographer",
          dateKey: "photoSelectionPhotographerDueDate",
          timeKey: "photoSelectionPhotographerDueTime",
        })
        slots.push({
          key: "photo_selection_client",
          dateKey: "photoSelectionClientDueDate",
          timeKey: "photoSelectionClientDueTime",
        })
        break
      case "lr_to_hr_setup":
        slots.push({
          key: step.stepId,
          dateKey: "lrToHrDueDate",
          timeKey: "lrToHrDueTime",
        })
        break
      case "handprint_high_res_config":
        // Photographer check form is inside this block; add its slot first for chronology
        slots.push({
          key: "photographer_check_client_selection",
          dateKey: "photographerCheckDueDate",
          timeKey: "photographerCheckDueTime",
        })
        slots.push({
          key: step.stepId,
          dateKey: "lrToHrDueDate",
          timeKey: "lrToHrDueTime",
        })
        break
      case "edition_config":
        slots.push({
          key: "edition_config_photographer",
          dateKey: "editionPhotographerDueDate",
          timeKey: "editionPhotographerDueTime",
        })
        slots.push({
          key: "edition_config_studio",
          dateKey: "editionStudioDueDate",
          timeKey: "editionStudioDueTime",
        })
        break
      case "check_finals":
        slots.push({
          key: "check_finals_photographer",
          dateKey: "checkFinalsPhotographerDueDate",
          timeKey: "checkFinalsPhotographerDueTime",
        })
        slots.push({
          key: "check_finals_client",
          dateKey: "clientFinalsDeadline",
          timeKey: "clientFinalsDeadlineTime",
        })
        break
      default:
        break
    }
  }
  return slots
}

function parseDate(s: string | undefined): Date | null {
  if (!s || typeof s !== "string") return null
  const d = new Date(s + "T12:00:00")
  return Number.isNaN(d.getTime()) ? null : d
}

/** Compare two date strings (YYYY-MM-DD). Returns -1 if a < b, 0 if equal, 1 if a > b. */
function compareDateStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** Time preset order for same-day constraint (earlier = smaller index). */
const TIME_PRESET_ORDER: Record<string, number> = {
  morning: 0,
  "Morning (9:00am)": 0,
  midday: 1,
  "Midday (12:00pm)": 1,
  "Midday - 12:00pm": 1,
  "end-of-day": 2,
  "End of day (5:00pm)": 2,
  "End of day - 05:00pm": 2,
}

function getTimeOrder(value: string | undefined): number {
  if (!value) return -1
  return TIME_PRESET_ORDER[value] ?? 0
}

/**
 * Compute chronological constraints for all date/time pickers in the Creation Template.
 * Uses derived steps order (computeCreationTemplate). Pure function; no I/O.
 */
export function getChronologyConstraints(
  draft: CollectionDraft
): ChronologyConstraintsResult {
  const steps = computeCreationTemplate(draft.config)
  const slots = getOrderedDateSlots(steps)
  const c = draft.config
  const byBlockId: Record<string, ChronologyConstraint> = {}
  const suggestedCorrection: Partial<CollectionConfig> = {}
  let previousDate: string | undefined
  let previousTime: string | undefined

  slots.forEach((slot, index) => {
    const currentDateStr = c[slot.dateKey] as string | undefined
    const currentTimeStr = slot.timeKey ? (c[slot.timeKey] as string | undefined) : undefined
    const currentDate = parseDate(currentDateStr)

    const isFirstSlotInOrder = index === 0
    const minDate = previousDate ?? undefined
    const defaultDate = isFirstSlotInOrder ? undefined : (previousDate ?? undefined)
    const isEnabled = isFirstSlotInOrder || !!previousDate
    const reason = undefined

    const sameDay = previousDate && currentDateStr && previousDate === currentDateStr
    const minTimePolicy: ChronologyConstraint["minTimePolicy"] =
      sameDay && previousTime ? "sameDayNotBeforePreviousTime" : "none"
    const previousTimePreset = sameDay ? previousTime : undefined

    byBlockId[slot.key] = {
      minDate,
      defaultDate,
      minTimePolicy,
      previousTimePreset,
      isEnabled,
      reason,
    }

    // Auto-correct: if current value is before minDate, suggest correction to minDate
    if (minDate && currentDateStr && compareDateStrings(currentDateStr, minDate) < 0) {
      ;(suggestedCorrection as Record<string, string>)[slot.dateKey] = minDate
      if (slot.timeKey && previousTime) {
        ;(suggestedCorrection as Record<string, string>)[slot.timeKey] = previousTime
      }
    }

    // Update previous to latest in this slot (for next iteration)
    const slotDate = currentDateStr || previousDate
    const slotTime = currentTimeStr ?? previousTime
    if (slotDate) {
      previousDate = slotDate
      previousTime = slotTime
    }
  })

  return {
    byBlockId,
    suggestedCorrection: Object.keys(suggestedCorrection).length > 0 ? suggestedCorrection : undefined,
  }
}
