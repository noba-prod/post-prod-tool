/**
 * Pure helpers for *_deadline_missed prerequisite checks.
 * Kept separate so Digital vs Analog branching can be unit-tested without DB.
 */

export type WorkflowKindForMissedGuard = "digital" | "analog"

/**
 * Prerequisite for photographer_selection_deadline_missed.
 * Analog: scanning_completed (historical).
 * Digital: shooting_completed_confirmed (no scanning step).
 * Explicit workflow branch — never OR both prerequisites.
 */
export function isPhotographerSelectionMissedPrerequisiteMet(
  workflow: WorkflowKindForMissedGuard,
  eventTypes: Iterable<string>
): boolean {
  const set = eventTypes instanceof Set ? eventTypes : new Set(eventTypes)
  if (set.has("photographer_selection_uploaded")) return false
  if (workflow === "digital") return set.has("shooting_completed_confirmed")
  return set.has("scanning_completed")
}
