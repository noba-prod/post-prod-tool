/**
 * Step health computation: derives per-step stage and health labels.
 * Pure functions. No UI, no I/O.
 *
 * Stage values: "upcoming" | "in-progress" | "done"
 * Health values: "on-track" | "on-time" | "delayed" | "at-risk" | null
 *
 * Health logic:
 * - done + completed on or before deadline  → "on-time"
 * - done + completed after deadline         → "delayed"
 * - in-progress + well before deadline      → "on-track"
 * - in-progress + within 24h of deadline    → "at-risk"
 * - in-progress + deadline passed           → "delayed"
 * - upcoming                                → null
 */

import type { CollectionConfig } from "./types"
import type { ViewStepId } from "./view-mode-steps"
import { getViewStepDefinitions, configToViewStepsInput, EVENT_TYPE_TO_STEP_ID } from "./view-mode-steps"

// =============================================================================
// TYPES
// =============================================================================

export type StepStage = "upcoming" | "in-progress" | "done"
export type StepHealth = "on-track" | "on-time" | "delayed" | "at-risk" | null

export interface StepStatusEntry {
  stage: StepStage
  health: StepHealth
}

export type StepStatuses = Record<string, StepStatusEntry>

interface CollectionEventLike {
  event_type: string
  created_at: string
  metadata?: Record<string, unknown> | null
}

// =============================================================================
// DEADLINE EXTRACTION (reused from view-mode-steps logic)
// =============================================================================

/** Extract deadline date+time from collection config for a given step. */
export function getDeadlineForStep(
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

// =============================================================================
// DATE PARSING
// =============================================================================

/** 24-hour warning threshold in ms. */
const AT_RISK_THRESHOLD_MS = 24 * 60 * 60 * 1000

/** Parse date + optional time into a Date. Returns null if invalid. */
function parseDeadline(dateStr?: string, timeStr?: string): Date | null {
  const raw = (dateStr ?? "").trim()
  if (!raw) return null
  const dateOnly = raw.includes("T") ? raw.slice(0, 10) : raw
  if (dateOnly.length < 10) return null

  // Normalize time: "morning" → 09:00, "afternoon" → 14:00, etc.
  const t = (timeStr ?? "").trim().toLowerCase()
  let hh = 17 // default: end of day 5pm
  let mm = 0
  if (t === "morning" || t === "morning (9:00am)") {
    hh = 9
  } else if (t === "midday" || t.includes("12:00")) {
    hh = 12
  } else if (/^\d{1,2}:\d{2}/.test(t)) {
    const parts = t.split(":").map(Number)
    hh = parts[0] ?? 17
    mm = parts[1] ?? 0
  }

  const built = `${dateOnly}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`
  const d = new Date(built)
  return Number.isNaN(d.getTime()) ? null : d
}

// =============================================================================
// HEALTH COMPUTATION
// =============================================================================

/**
 * Compute health label for a single step.
 * @param stage - Current stage of the step
 * @param deadlineDate - Deadline date string from config
 * @param deadlineTime - Deadline time string from config
 * @param now - Current time
 * @param completedAt - When the step was completed (ISO string from event created_at), if applicable
 */
export function computeStepHealth(
  stage: StepStage,
  deadlineDate?: string,
  deadlineTime?: string,
  now: Date = new Date(),
  completedAt?: string
): StepHealth {
  if (stage === "upcoming") return null

  const deadline = parseDeadline(deadlineDate, deadlineTime)

  if (stage === "done") {
    if (!deadline) return "on-time" // no deadline → always on-time
    if (completedAt) {
      const completed = new Date(completedAt)
      return completed.getTime() <= deadline.getTime() ? "on-time" : "delayed"
    }
    return "on-time" // no completedAt info → assume on-time
  }

  // stage === "in-progress"
  if (!deadline) return "on-track" // no deadline → on-track by default
  const nowMs = now.getTime()
  const deadlineMs = deadline.getTime()

  if (nowMs >= deadlineMs) return "delayed"
  if (deadlineMs - nowMs <= AT_RISK_THRESHOLD_MS) return "at-risk"
  return "on-track"
}

// =============================================================================
// FULL STEP STATUSES COMPUTATION
// =============================================================================

/**
 * Derive completed step IDs from a list of event types using EVENT_TYPE_TO_STEP_ID.
 */
export function deriveCompletedStepIds(eventTypes: string[]): Set<string> {
  const stepIds = new Set<string>()
  for (const et of eventTypes) {
    const stepId = EVENT_TYPE_TO_STEP_ID[et]
    if (stepId) stepIds.add(stepId)
  }
  return stepIds
}

function getRevertTargetStepId(sourceRaw: unknown): ViewStepId {
  const source = String(sourceRaw ?? "").trim()
  if (source === "client") return "photographer_selection"
  if (source === "photographer_review") return "client_selection"
  if (source === "high_res") return "photographer_check_client_selection"
  if (source === "photographer_last_check") return "final_edits"
  if (source === "client_confirmation") return "photographer_last_check"
  // default case (photographer selection missing photos)
  return "low_res_scanning"
}

function deriveProgressFromEvents(
  definitions: ReturnType<typeof getViewStepDefinitions>,
  events: CollectionEventLike[]
): { completedStepIds: Set<string>; completedAtMap: Record<string, string> } {
  const visibleStepIds = definitions.filter((d) => !d.inactive).map((d) => d.id)
  const indexByStepId = new Map<ViewStepId, number>(
    visibleStepIds.map((id, idx) => [id as ViewStepId, idx])
  )
  const completedStepIds = new Set<string>()
  const completedAtMap: Record<string, string> = {}

  for (const e of events) {
    const eventType = e.event_type
    if (eventType === "photographer_requested_additional_photos") {
      const source = (e.metadata as { source?: unknown } | null | undefined)?.source
      const revertTarget = getRevertTargetStepId(source)
      const revertIdx = indexByStepId.get(revertTarget)
      if (revertIdx != null) {
        for (let i = revertIdx; i < visibleStepIds.length; i++) {
          const stepId = visibleStepIds[i]
          if (!stepId) continue
          completedStepIds.delete(stepId)
          delete completedAtMap[stepId]
        }
      }
      continue
    }

    const completedStepId = EVENT_TYPE_TO_STEP_ID[eventType]
    if (completedStepId) {
      completedStepIds.add(completedStepId)
      completedAtMap[completedStepId] = e.created_at
    }
  }

  return { completedStepIds, completedAtMap }
}

/**
 * Compute step_statuses and completion_percentage for a collection.
 *
 * @param config - Collection config (for deadlines and step visibility)
 * @param eventTypes - Array of event_type strings from collection_events
 * @param eventCreatedAtMap - Map of stepId → ISO created_at string (when the completing event was recorded)
 * @param now - Current time (for health computation)
 * @returns { stepStatuses, completionPercentage }
 */
export function computeStepStatuses(
  config: CollectionConfig,
  eventTypes: string[],
  eventCreatedAtMap: Record<string, string>,
  events?: CollectionEventLike[],
  now: Date = new Date()
): { stepStatuses: StepStatuses; completionPercentage: number } {
  const viewInput = configToViewStepsInput(config)
  const definitions = getViewStepDefinitions(viewInput)
  const derived =
    events && events.length > 0
      ? deriveProgressFromEvents(definitions, events)
      : { completedStepIds: deriveCompletedStepIds(eventTypes), completedAtMap: eventCreatedAtMap }
  const completedStepIds = derived.completedStepIds

  // Find visible (non-inactive) step IDs
  const visibleSteps = definitions.filter((d) => !d.inactive)
  const visibleStepIds = visibleSteps.map((d) => d.id)

  // Determine first active visible step (first non-completed visible step)
  const firstActiveVisibleId = visibleStepIds.find((id) => !completedStepIds.has(id))

  const stepStatuses: StepStatuses = {}

  for (const def of definitions) {
    if (def.inactive) continue // skip inactive steps entirely

    const stepId = def.id as ViewStepId
    const isCompleted = completedStepIds.has(stepId)
    const isActive = !isCompleted && stepId === firstActiveVisibleId

    const stage: StepStage = isCompleted ? "done" : isActive ? "in-progress" : "upcoming"
    const deadline = getDeadlineForStep(config, stepId)
    const completedAt = isCompleted ? derived.completedAtMap[stepId] : undefined

    const health = computeStepHealth(stage, deadline.date, deadline.time, now, completedAt)

    stepStatuses[stepId] = { stage, health }
  }

  // Completion percentage: count "done" visible steps
  const doneCount = visibleStepIds.filter((id) => completedStepIds.has(id)).length
  const completionPercentage =
    visibleStepIds.length > 0 ? Math.round((doneCount / visibleStepIds.length) * 100) : 0

  return { stepStatuses, completionPercentage }
}

/**
 * Build eventCreatedAtMap from collection events.
 * Maps stepId → earliest created_at for the completing event.
 */
export function buildEventCreatedAtMap(
  events: Array<{ event_type: string; created_at: string; metadata?: Record<string, unknown> | null }>
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const e of events) {
    const stepId = EVENT_TYPE_TO_STEP_ID[e.event_type]
    if (stepId && !map[stepId]) {
      map[stepId] = e.created_at
    }
  }
  return map
}
