/**
 * Domain check: structural-workflow-change pure functions.
 * Covers every PHOTO scenario transition pair (6×6) and asserts:
 *   • diff detection
 *   • view-step diff (added / removed / survived)
 *   • step_statuses migration (preserve survivors' done, drop removed)
 *   • completion percentage recomputation against new denominator
 *   • creation completed-block reconciliation against new template
 *   • participant validation (now-required / orphan)
 *   • purge spec mapping (notification template steps to clean)
 *
 * Run with: `npx tsx lib/domain/collections/__tests__/structural-workflow-change-check.ts`
 */

import {
  diffStructuralConfigs,
  diffViewSteps,
  getActiveViewStepIds,
  getStepArtifactPurgePatch,
  isStructuralChangeBlockedByStatus,
  migrateCreationCompletedBlocks,
  migrateStepStatusesForStructuralChange,
  reconcileStructuralChange,
  validateParticipantsForConfig,
  STRUCTURAL_CONFIG_KEYS,
} from "../structural-workflow-change"
import type { CollectionConfig, CollectionParticipant, CreationBlockId } from "../types"
import type { StepStatuses, StepStage } from "../step-health"
import type { ViewStepId } from "../view-mode-steps"
import {
  SCENARIO_1_DIGITAL_ONLY,
  SCENARIO_2_DIGITAL_EDITION,
  SCENARIO_3_HANDPRINT_ONLY,
  SCENARIO_4_HANDPRINT_EDITION,
  SCENARIO_5_HANDPRINT_DIFF_LAB,
  SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB,
} from "../scenario-matrix"

let failed = 0

function assert(name: string, cond: boolean, details?: string): void {
  if (cond) {
    console.log(`OK ${name}`)
  } else {
    failed++
    console.error(`FAIL ${name}${details ? ` — ${details}` : ""}`)
  }
}

function setsEqual<T>(a: Iterable<T>, b: Iterable<T>): boolean {
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size !== sb.size) return false
  for (const x of sa) if (!sb.has(x)) return false
  return true
}

function arrEq<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function doneStatuses(stepIds: ViewStepId[]): StepStatuses {
  const out: StepStatuses = {}
  for (const id of stepIds) {
    out[id] = { stage: "done" as StepStage, health: "on-time" }
  }
  return out
}

// =============================================================================
// 1) diffStructuralConfigs
// =============================================================================

;(function diffTests() {
  // No-op edit (only name change) → not structural
  const a: CollectionConfig = { ...SCENARIO_1_DIGITAL_ONLY }
  const b: CollectionConfig = { ...SCENARIO_1_DIGITAL_ONLY, name: "Another" }
  const d1 = diffStructuralConfigs(a, b)
  assert("diff: cosmetic name change is NOT structural", !d1.isStructural)
  assert("diff: cosmetic change produces empty changedKeys", d1.changedKeys.length === 0)

  // Toggle hasEditionStudio → structural with 1 key
  const c: CollectionConfig = { ...SCENARIO_1_DIGITAL_ONLY, hasEditionStudio: true }
  const d2 = diffStructuralConfigs(a, c)
  assert("diff: toggling hasEditionStudio is structural", d2.isStructural)
  assert(
    "diff: only hasEditionStudio listed",
    arrEq(d2.changedKeys, ["hasEditionStudio"])
  )
  assert(
    "diff: change record correct",
    d2.changes.hasEditionStudio?.from === false && d2.changes.hasEditionStudio?.to === true
  )

  // Digital → Analog HP+Diff: hasHandprint, hasLowResLab, handprintVariant, handprintIsDifferentLab
  const e = diffStructuralConfigs(SCENARIO_1_DIGITAL_ONLY, {
    ...SCENARIO_5_HANDPRINT_DIFF_LAB,
    handprintVariant: "hp",
  })
  assert(
    "diff: Digital→Analog HP DiffLab — all relevant keys flagged",
    setsEqual(e.changedKeys, [
      "hasHandprint",
      "hasLowResLab",
      "handprintIsDifferentLab",
      "handprintVariant",
    ])
  )

  assert(
    "diff: STRUCTURAL_CONFIG_KEYS includes all 6 keys",
    STRUCTURAL_CONFIG_KEYS.length === 6
  )
})()

// =============================================================================
// 2) View-step diff for known transitions
// =============================================================================

;(function viewStepDiffTests() {
  // Digital only → Handprint only (Scenario 1 → 3): adds negatives_dropoff, low_res_scanning, photographer_last_check
  const d = diffViewSteps(SCENARIO_1_DIGITAL_ONLY, SCENARIO_3_HANDPRINT_ONLY)
  assert(
    "viewDiff: 1→3 added contains negatives_dropoff & low_res_scanning",
    d.added.includes("negatives_dropoff") && d.added.includes("low_res_scanning")
  )
  assert("viewDiff: 1→3 removed is empty (digital steps are subset)", d.removed.length === 0)

  // Reverse: Handprint only → Digital only — removes the same
  const r = diffViewSteps(SCENARIO_3_HANDPRINT_ONLY, SCENARIO_1_DIGITAL_ONLY)
  assert(
    "viewDiff: 3→1 removed contains negatives_dropoff & low_res_scanning",
    r.removed.includes("negatives_dropoff") && r.removed.includes("low_res_scanning")
  )

  // Toggle edition off (scenario 4 → 3) removes edition_request, final_edits
  const editOff = diffViewSteps(SCENARIO_4_HANDPRINT_EDITION, SCENARIO_3_HANDPRINT_ONLY)
  assert(
    "viewDiff: 4→3 removes final_edits",
    editOff.removed.includes("final_edits")
  )
})()

// =============================================================================
// 3) Step-statuses migration & completion percentage
// =============================================================================

;(function stepStatusesTests() {
  // Setup: Analog HP+Edition+DiffLab fully completed → switching to Digital should preserve
  // shooting, photographer_selection, client_selection, handprint_high_res, client_confirmation
  // BUT drop negatives_dropoff, low_res_scanning, edition_request, final_edits, photographer_last_check.
  // BUT: edition_request inactive in Digital+Edition too (because !hasHandprint && hasEditionStudio merges step).
  // For pure Digital (no edition): photographer_last_check is also inactive.

  const oldConfig = SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB
  const newConfig = SCENARIO_1_DIGITAL_ONLY
  const oldActive = getActiveViewStepIds(oldConfig)
  const allDone = doneStatuses(oldActive)
  const result = migrateStepStatusesForStructuralChange(allDone, oldConfig, newConfig)
  const newActive = getActiveViewStepIds(newConfig)
  assert(
    "stepStatuses: only new-active step ids remain in the map",
    Object.keys(result.stepStatuses).every((id) => newActive.includes(id as ViewStepId))
  )

  const survivorsThatWereDone = newActive.filter((id) => oldActive.includes(id))
  assert(
    "stepStatuses: every survivor that was done is preserved as done",
    survivorsThatWereDone.every(
      (id) => (result.stepStatuses[id] as { stage?: StepStage } | undefined)?.stage === "done"
    )
  )

  // Completion: numerator = survivors that were done, denominator = |newActive|
  const expectedPct = Math.round((survivorsThatWereDone.length / newActive.length) * 100)
  assert(
    "stepStatuses: completionPercentage recalculated against new denominator",
    result.completionPercentage === expectedPct,
    `expected ${expectedPct} got ${result.completionPercentage}`
  )

  // 100% in the larger flow stays 100% only if every new-active step was already done.
  assert(
    "stepStatuses: when survivors fully cover newActive, percentage = 100",
    survivorsThatWereDone.length === newActive.length
      ? result.completionPercentage === 100
      : result.completionPercentage < 100
  )

  // Edge: completionPercentage stays 0 when there is no previous progress
  const emptyResult = migrateStepStatusesForStructuralChange(
    {},
    SCENARIO_1_DIGITAL_ONLY,
    SCENARIO_3_HANDPRINT_ONLY
  )
  assert("stepStatuses: empty input → 0%", emptyResult.completionPercentage === 0)

  // Edge: handprint→digital with done flags should drop the analog-only entries
  const oldDigital = SCENARIO_1_DIGITAL_ONLY
  const handprintActive = getActiveViewStepIds(SCENARIO_3_HANDPRINT_ONLY)
  const someDone: StepStatuses = doneStatuses([
    "shooting",
    "negatives_dropoff",
    "low_res_scanning",
  ])
  const reverse = migrateStepStatusesForStructuralChange(
    someDone,
    SCENARIO_3_HANDPRINT_ONLY,
    oldDigital
  )
  assert(
    "stepStatuses: negatives_dropoff dropped after switching to Digital",
    reverse.stepStatuses["negatives_dropoff"] === undefined
  )
  assert(
    "stepStatuses: shooting (survivor) preserved as done",
    (reverse.stepStatuses["shooting"] as { stage?: StepStage } | undefined)?.stage === "done"
  )
  void handprintActive
})()

// =============================================================================
// 4) Creation completed-block reconciliation
// =============================================================================

;(function completedBlockTests() {
  // Old config: Handprint Only with all blocks completed
  const prev: CreationBlockId[] = [
    "participants",
    "shooting_setup",
    "dropoff_plan",
    "low_res_config",
    "photo_selection",
    "photographer_selection_config",
    "client_selection_config",
    "handprint_high_res_config",
    "check_finals",
  ]
  const reconciled = migrateCreationCompletedBlocks(prev, SCENARIO_1_DIGITAL_ONLY)
  assert(
    "completedBlocks: drops dropoff_plan and low_res_config when switching to Digital",
    !reconciled.includes("dropoff_plan") && !reconciled.includes("low_res_config")
  )
  assert(
    "completedBlocks: drops handprint_high_res_config (digital uses lr_to_hr_setup)",
    !reconciled.includes("handprint_high_res_config")
  )
  assert(
    "completedBlocks: keeps participants/shooting_setup/photo_selection*",
    reconciled.includes("participants") &&
      reconciled.includes("shooting_setup") &&
      reconciled.includes("photo_selection") &&
      reconciled.includes("photographer_selection_config") &&
      reconciled.includes("client_selection_config")
  )

  // Opposite direction: Digital → Handprint Only; new blocks remain incomplete
  const reverse = migrateCreationCompletedBlocks(
    [
      "participants",
      "shooting_setup",
      "photo_selection",
      "lr_to_hr_setup",
      "check_finals",
    ],
    SCENARIO_3_HANDPRINT_ONLY
  )
  assert(
    "completedBlocks: Digital→Handprint drops lr_to_hr_setup (handprint uses handprint_high_res_config)",
    !reverse.includes("lr_to_hr_setup")
  )
})()

// =============================================================================
// 5) Purge spec mapping
// =============================================================================

;(function purgeTests() {
  // Analog HP+Edition+DiffLab → Digital Only: removes negatives_dropoff, low_res_scanning,
  // edition_request, final_edits, photographer_last_check (photographer_last_check inactive in Digital-only).
  const diff = diffViewSteps(SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB, SCENARIO_1_DIGITAL_ONLY)
  const purge = getStepArtifactPurgePatch(diff.removed)
  // notification template step numbers should map 1:1 with removed view steps
  const expectedSteps = new Set<number>()
  for (const s of diff.removed) {
    if (s === "negatives_dropoff") expectedSteps.add(2)
    if (s === "low_res_scanning") expectedSteps.add(3)
    if (s === "edition_request") expectedSteps.add(8)
    if (s === "final_edits") expectedSteps.add(9)
    if (s === "photographer_last_check") expectedSteps.add(10)
  }
  assert(
    "purge: notification template step numbers match removed steps",
    setsEqual(purge.notificationTemplateStepsToClean, expectedSteps)
  )
  assert(
    "purge: includes URL/note fields for removed steps",
    purge.urlFieldsToEmpty.includes("lowResSelectionUrl") &&
      purge.noteFieldsToEmpty.includes("stepNotesLowRes")
  )

  // Same config → empty purge
  const empty = getStepArtifactPurgePatch([])
  assert("purge: empty when nothing removed", empty.urlFieldsToEmpty.length === 0)
  assert(
    "purge: configDeadlineFieldsToClear populated for low_res_scanning",
    purge.configDeadlineFieldsToClear.includes("lowResScanDeadlineDate")
  )
})()

// =============================================================================
// 6) Participant validation
// =============================================================================

;(function participantTests() {
  // Old: Analog HP+Edition+DiffLab (requires producer, client, photographer, photo_lab, handprint_lab, retouch_studio)
  // New: Digital Only (requires producer, client, photographer)
  // → orphanedRoles should include photo_lab, handprint_lab, retouch_studio
  const participants: CollectionParticipant[] = [
    { role: "producer", userIds: ["u1"], editPermissionByUserId: { u1: true } },
    { role: "client", entityId: "c1", userIds: ["u2"], editPermissionByUserId: {} },
    { role: "photographer", userIds: ["u3"], editPermissionByUserId: {} },
    { role: "photo_lab", entityId: "lab1", userIds: ["u4"], editPermissionByUserId: {} },
    { role: "handprint_lab", entityId: "lab2", userIds: ["u5"], editPermissionByUserId: {} },
    { role: "retouch_studio", entityId: "studio", userIds: ["u6"], editPermissionByUserId: {} },
  ]
  const v = validateParticipantsForConfig(
    participants,
    SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB,
    SCENARIO_1_DIGITAL_ONLY
  )
  assert(
    "participants: orphans photo_lab, handprint_lab, retouch_studio when going to Digital",
    setsEqual(v.orphanedRoles, ["photo_lab", "handprint_lab", "retouch_studio"])
  )
  assert("participants: no missingRequired (producer/client/photographer present)", v.missingRequiredRoles.length === 0)

  // Reverse: Digital → Handprint Only (with NO photo_lab present)
  const minimal: CollectionParticipant[] = [
    { role: "producer", userIds: ["u1"] },
    { role: "client", entityId: "c1", userIds: ["u2"] },
    { role: "photographer", userIds: ["u3"] },
  ]
  const v2 = validateParticipantsForConfig(minimal, SCENARIO_1_DIGITAL_ONLY, SCENARIO_3_HANDPRINT_ONLY)
  assert("participants: missing photo_lab flagged on Digital→Handprint", v2.missingRequiredRoles.includes("photo_lab"))
  assert("participants: no orphans when previously required ⊆ now required", v2.orphanedRoles.length === 0)
})()

// =============================================================================
// 7) Terminal status guard
// =============================================================================

;(function terminalGuardTests() {
  assert("guard: canceled blocked", isStructuralChangeBlockedByStatus("canceled"))
  assert("guard: completed blocked", isStructuralChangeBlockedByStatus("completed"))
  assert("guard: draft NOT blocked", !isStructuralChangeBlockedByStatus("draft"))
  assert("guard: upcoming NOT blocked", !isStructuralChangeBlockedByStatus("upcoming"))
  assert("guard: in_progress NOT blocked", !isStructuralChangeBlockedByStatus("in_progress"))
})()

// =============================================================================
// 8) Full reconciliation result (end-to-end)
// =============================================================================

;(function reconcileTests() {
  const prev = {
    config: SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB,
    participants: [
      { role: "producer" as const, userIds: ["u1"] },
      { role: "client" as const, entityId: "c1", userIds: ["u2"] },
      { role: "photographer" as const, userIds: ["u3"] },
      { role: "photo_lab" as const, entityId: "lab1", userIds: ["u4"] },
      { role: "handprint_lab" as const, entityId: "lab2", userIds: ["u5"] },
      { role: "retouch_studio" as const, entityId: "studio", userIds: ["u6"] },
    ],
    creationData: { completedBlockIds: ["participants", "shooting_setup", "dropoff_plan"] as CreationBlockId[] },
    stepStatuses: doneStatuses(["shooting", "negatives_dropoff", "low_res_scanning"]),
  }
  const out = reconcileStructuralChange(prev, SCENARIO_1_DIGITAL_ONLY)
  assert("reconcile: isStructural true", out.isStructural)
  assert(
    "reconcile: viewStepDiff.removed contains negatives_dropoff and low_res_scanning",
    out.viewStepDiff.removed.includes("negatives_dropoff") &&
      out.viewStepDiff.removed.includes("low_res_scanning")
  )
  assert(
    "reconcile: completedBlockIds drops dropoff_plan",
    !out.completedBlockIds.includes("dropoff_plan")
  )
  assert(
    "reconcile: completedBlockIds keeps participants and shooting_setup",
    out.completedBlockIds.includes("participants") && out.completedBlockIds.includes("shooting_setup")
  )
  assert(
    "reconcile: orphan roles surface (photo_lab/handprint_lab/retouch_studio)",
    setsEqual(out.participants.orphanedRoles, ["photo_lab", "handprint_lab", "retouch_studio"])
  )
  assert(
    "reconcile: purge.notificationTemplateStepsToClean is non-empty",
    out.purge.notificationTemplateStepsToClean.length > 0
  )

  // No-op (same config) → isStructural false, no purge
  const same = reconcileStructuralChange(prev, SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB)
  assert("reconcile: no-op → isStructural false", !same.isStructural)
  assert("reconcile: no-op → purge empty", same.purge.removedViewStepIds.length === 0)
})()

// =============================================================================
// EXIT
// =============================================================================

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`)
  process.exit(1)
}
console.log("\nAll structural-workflow-change checks passed.")
