/**
 * View-mode steps: canonical list of all possible collection steps and derivation from config.
 * Aligned with collections-logic.md §10 and the scenario matrix (Digital / Hand print / Edition / Different lab).
 * Reusable for: dev demo variants, real collection view page.
 */

import type { CollectionConfig } from "./types"

// =============================================================================
// CANONICAL VIEW STEP IDS (execution order, collections-logic §10)
// =============================================================================

export const VIEW_STEP_IDS = [
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

export type ViewStepId = (typeof VIEW_STEP_IDS)[number]

const VIEW_STEP_TITLES: Record<ViewStepId, string> = {
  shooting: "Shooting",
  negatives_dropoff: "Negatives drop off",
  low_res_scanning: "Low-res scanning",
  photographer_selection: "Photographer selection",
  client_selection: "Client selection",
  photographer_check_client_selection: "Photographer check client selection",
  handprint_high_res: "Low-res to high-res",
  edition_request: "Edition request",
  final_edits: "Final edits",
  photographer_last_check: "Photographer last check",
  client_confirmation: "Client confirmation",
}

// =============================================================================
// VIEW STEP DEFINITION (for template; status/annotation filled by config + optional deadlines)
// =============================================================================

export interface ViewStepDefinition {
  id: ViewStepId
  title: string
  /** When true, step is not part of this collection type (greyed out in UI). */
  inactive: boolean
  /** Optional contextual note (e.g. "by different HP lab", "No shipping details"). */
  annotation?: string
  /** When true, step requires attention (e.g. red exclamation). */
  attention?: boolean
}

export interface ViewStepsConfigInput {
  /** Digital path: no negatives/low-res steps. Hand print: includes them. */
  hasHandprint: boolean
  /** Edition path: includes edition request, final edits, photographer last check. */
  hasEditionStudio: boolean
  /** When hasHandprint and true: Low-res to high-res step shows "by different HP lab". */
  handprintIsDifferentLab: boolean
  /** Optional: show "No shipping details" on Low-res scanning (e.g. when shipping not filled). */
  lowResNoShippingDetails?: boolean
}

/**
 * Derives view step definitions from collection config (modal configuration).
 * Returns all 10 steps; inactive steps are greyed out in the template.
 */
export function getViewStepDefinitions(
  input: ViewStepsConfigInput
): ViewStepDefinition[] {
  const { hasHandprint, hasEditionStudio, handprintIsDifferentLab, lowResNoShippingDetails } =
    input

  const steps: ViewStepDefinition[] = VIEW_STEP_IDS.map((id) => {
    const title = VIEW_STEP_TITLES[id]
    let inactive = false
    let annotation: string | undefined
    let attention = false

    switch (id) {
      case "negatives_dropoff":
      case "low_res_scanning":
        inactive = !hasHandprint
        if (id === "low_res_scanning" && !inactive && lowResNoShippingDetails) {
          annotation = "No shipping details"
        }
        break
      case "photographer_check_client_selection":
        inactive = !hasHandprint
        break
      case "handprint_high_res":
        if (hasHandprint && handprintIsDifferentLab) {
          annotation = "by different HP lab"
        }
        break
      case "edition_request":
      case "final_edits":
      case "photographer_last_check":
        inactive = !hasEditionStudio
        if (id === "edition_request" && !inactive) {
          attention = true
        }
        break
      default:
        break
    }

    return {
      id,
      title,
      inactive,
      ...(annotation && { annotation }),
      ...(attention && { attention }),
    }
  })

  return steps
}

/**
 * Maps CollectionConfig to ViewStepsConfigInput for getViewStepDefinitions.
 */
export function configToViewStepsInput(config: CollectionConfig): ViewStepsConfigInput {
  return {
    hasHandprint: config.hasHandprint,
    hasEditionStudio: config.hasEditionStudio,
    handprintIsDifferentLab: config.handprintIsDifferentLab,
    lowResNoShippingDetails: false,
  }
}

// =============================================================================
// DEADLINES FROM COLLECTION CONFIG (real view; step labels inherit from collection)
// =============================================================================

/** Maps each view step to the config date/time fields used for deadline display. */
function getDeadlineIsoFromConfig(
  config: CollectionConfig,
  stepId: ViewStepId
): { date?: string; time?: string } {
  switch (stepId) {
    case "shooting":
      return {
        date: config.shootingStartDate ?? config.shootingDate,
        time: config.shootingStartTime,
      }
    case "negatives_dropoff":
      return { date: config.dropoff_delivery_date, time: config.dropoff_delivery_time }
    case "low_res_scanning":
      return {
        date: config.lowResScanDeadlineDate,
        time: config.lowResScanDeadlineTime,
      }
    case "photographer_selection":
      return {
        date: config.photoSelectionPhotographerDueDate,
        time: config.photoSelectionPhotographerDueTime,
      }
    case "client_selection":
      return {
        date: config.photoSelectionClientDueDate,
        time: config.photoSelectionClientDueTime,
      }
    case "photographer_check_client_selection":
      return {
        date: config.photographerCheckDueDate,
        time: config.photographerCheckDueTime,
      }
    case "handprint_high_res":
      return { date: config.lrToHrDueDate, time: config.lrToHrDueTime }
    case "edition_request":
      return {
        date: config.editionPhotographerDueDate,
        time: config.editionPhotographerDueTime,
      }
    case "final_edits":
      return {
        date: config.editionStudioDueDate,
        time: config.editionStudioDueTime,
      }
    case "photographer_last_check":
      return {
        date: config.checkFinalsPhotographerDueDate,
        time: config.checkFinalsPhotographerDueTime,
      }
    case "client_confirmation":
      return {
        date: config.clientFinalsDeadline ?? config.checkFinalsClientDueDate,
        time: config.clientFinalsDeadlineTime ?? config.checkFinalsClientDueTime,
      }
    default:
      return {}
  }
}

/** Format ISO date for display. */
export function formatDeadlineDate(iso: string): string {
  const d = new Date(iso + "T12:00:00")
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Format time for display (e.g. "End of day (5:00pm)" or raw time). */
function formatDeadlineTime(time?: string): string {
  if (!time?.trim()) return "End of day (5:00pm)"
  return time.trim()
}

// =============================================================================
// DEMO: DEFAULT DEADLINES (for dev template only)
// =============================================================================

const DEFAULT_DEADLINES: Record<ViewStepId, string> = {
  shooting: "2025-11-28",
  negatives_dropoff: "2025-12-04",
  low_res_scanning: "2025-12-10",
  photographer_selection: "2025-12-18",
  client_selection: "2025-12-24",
  photographer_check_client_selection: "2026-01-04",
  handprint_high_res: "2026-01-06",
  edition_request: "2026-01-12",
  final_edits: "2026-01-20",
  photographer_last_check: "2026-01-25",
  client_confirmation: "2026-01-30",
}

export type ViewStepStatus = "locked" | "active" | "completed"

/**
 * Builds template steps with status from deadlines (only for non-inactive steps).
 * Inactive steps get status "locked"; active steps get completed/active/locked from asOfDate.
 * Used by dev demo.
 */
export function viewStepsWithStatus(
  definitions: ViewStepDefinition[],
  asOfDate: string
): Array<
  ViewStepDefinition & {
    status: ViewStepStatus
    deadlineDate?: string
    deadlineTime?: string
  }
> {
  let activeAssigned = false
  return definitions.map((def) => {
    if (def.inactive) {
      return {
        ...def,
        status: "locked" as ViewStepStatus,
        deadlineDate: formatDeadlineDate(DEFAULT_DEADLINES[def.id as ViewStepId]),
        deadlineTime: "End of day (5:00pm)",
      }
    }
    const deadlineIso = DEFAULT_DEADLINES[def.id as ViewStepId]
    const status: ViewStepStatus =
      deadlineIso < asOfDate
        ? "completed"
        : !activeAssigned
          ? ((activeAssigned = true), "active")
          : "locked"
    return {
      ...def,
      status,
      deadlineDate: formatDeadlineDate(deadlineIso),
      deadlineTime: "End of day (5:00pm)",
    }
  })
}

// =============================================================================
// COLLECTION VIEW: one active step, rest locked; deadlines from config
// =============================================================================

/** Maps collection event types to view step ids (event → step completed). */
export const EVENT_TYPE_TO_STEP_ID: Record<string, ViewStepId> = {
  negatives_pickup_marked: "shooting",
  dropoff_confirmed: "negatives_dropoff",
  scanning_completed: "low_res_scanning",
  client_selection_confirmed: "client_selection",
  photographer_edits_approved: "photographer_last_check",
  collection_completed: "client_confirmation",
}

export interface ViewStepsFromCollectionOptions {
  /** First visible step index that is "active" (default 0). Ignored when completedStepIds is set. */
  activeStepIndex?: number
  /** Step ids that are completed (e.g. from collection_events). When set, completed steps get "completed", first non-completed visible step gets "active", rest "locked". */
  completedStepIds?: string[]
}

/**
 * Builds view steps for a published collection: steps derived from config (same scenarios
 * as demo), deadlines from collection config. Status: completed from completedStepIds,
 * first non-completed visible step is active, rest locked.
 */
export function viewStepsWithStatusFromCollection(
  definitions: ViewStepDefinition[],
  config: CollectionConfig,
  options?: ViewStepsFromCollectionOptions
): Array<
  ViewStepDefinition & {
    status: ViewStepStatus
    deadlineDate?: string
    deadlineTime?: string
  }
> {
  const completedSet = new Set(options?.completedStepIds ?? [])
  const visibleIndices = definitions
    .map((d, i) => (d.inactive ? -1 : i))
    .filter((i) => i >= 0)
  const firstActiveVisibleIndex =
    completedSet.size > 0
      ? visibleIndices.find((idx) => !completedSet.has(definitions[idx]!.id)) ?? visibleIndices[visibleIndices.length - 1] ?? 0
      : visibleIndices[0] ?? 0

  return definitions.map((def, index) => {
    const { date: dateIso, time: timeRaw } = getDeadlineIsoFromConfig(config, def.id as ViewStepId)
    const deadlineDate = dateIso ? formatDeadlineDate(dateIso) : "—"
    const deadlineTime = timeRaw ? formatDeadlineTime(timeRaw) : "End of day (5:00pm)"

    if (def.inactive) {
      return {
        ...def,
        status: "locked" as ViewStepStatus,
        deadlineDate,
        deadlineTime,
      }
    }

    const isCompleted = completedSet.has(def.id)
    const isActive = !isCompleted && index === firstActiveVisibleIndex
    const status: ViewStepStatus = isCompleted ? "completed" : isActive ? "active" : "locked"

    return {
      ...def,
      status,
      deadlineDate,
      deadlineTime,
    }
  })
}
