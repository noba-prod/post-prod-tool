/**
 * Domain check: getChronologyConstraints returns correct byBlockId and suggestedCorrection.
 * Run with: npx tsx lib/domain/collections/__tests__/chronology-constraints-check.ts
 */

import { getChronologyConstraints } from "../workflow"
import type { CollectionDraft, CollectionConfig, CreationBlockId } from "../types"
import { SCENARIO_1_DIGITAL_ONLY, SCENARIO_3_HANDPRINT_ONLY } from "../scenario-matrix"

function minimalDraft(
  configOverrides: Partial<CollectionConfig>,
  creationDataOverrides?: { completedBlockIds?: CreationBlockId[] }
): CollectionDraft {
  const config: CollectionConfig = {
    ...SCENARIO_1_DIGITAL_ONLY,
    ...configOverrides,
  }
  return {
    id: "d1",
    status: "draft",
    config,
    participants: [],
    creationData: {
      completedBlockIds: creationDataOverrides?.completedBlockIds ?? ([] as CreationBlockId[]),
    },
    updatedAt: new Date().toISOString(),
  }
}

function runChronologyAssertions(): void {
  // 1) Digital-only draft with shooting start/end set — first slot enabled, second has minDate/defaultDate from first
  const draftWithShooting = minimalDraft({
    shootingStartDate: "2025-12-04",
    shootingStartTime: "Morning - 09:00am",
    shootingEndDate: "2025-12-05",
    shootingEndTime: "End of day - 05:00pm",
  })
  const result1 = getChronologyConstraints(draftWithShooting)
  const start = result1.byBlockId["shooting_setup"]
  const end = result1.byBlockId["shooting_setup_ending"]
  const photoPhotographer = result1.byBlockId["photo_selection_photographer"]

  if (!start?.isEnabled) {
    throw new Error("Expected shooting_setup to be enabled (first slot)")
  }
  if (end?.minDate !== "2025-12-04") {
    throw new Error(`Expected shooting_setup_ending minDate 2025-12-04, got ${end?.minDate}`)
  }
  if (photoPhotographer?.minDate !== "2025-12-05") {
    throw new Error(
      `Expected photo_selection_photographer minDate 2025-12-05 (from end), got ${photoPhotographer?.minDate}`
    )
  }
  if (photoPhotographer?.isEnabled !== true) {
    throw new Error("Expected photo_selection_photographer to be enabled")
  }
  if (result1.suggestedCorrection) {
    throw new Error("Expected no suggestedCorrection when dates are valid")
  }
  console.log("OK: digital-only with shooting dates — constraints and no correction")

  // 2) Draft with no shooting date — second slot disabled with reason
  const draftNoShooting = minimalDraft({})
  const result2 = getChronologyConstraints(draftNoShooting)
  const end2 = result2.byBlockId["shooting_setup_ending"]
  if (end2?.isEnabled !== false) {
    throw new Error("Expected shooting_setup_ending to be disabled when no previous date")
  }
  if (end2?.reason !== undefined) {
    throw new Error(`Expected reason to be hidden (undefined), got ${end2?.reason}`)
  }
  console.log("OK: no shooting date — downstream disabled, reason hidden")

  // 3) Downstream date before minDate — suggestedCorrection should correct it
  const draftInvalidDownstream = minimalDraft({
    shootingStartDate: "2025-12-10",
    shootingEndDate: "2025-12-10",
    shootingEndTime: "Midday - 12:00pm",
    photoSelectionPhotographerDueDate: "2025-12-09", // before shooting end
    photoSelectionPhotographerDueTime: "End of day - 05:00pm",
  })
  const result3 = getChronologyConstraints(draftInvalidDownstream)
  if (!result3.suggestedCorrection?.photoSelectionPhotographerDueDate) {
    throw new Error(
      "Expected suggestedCorrection.photoSelectionPhotographerDueDate when downstream date is before minDate"
    )
  }
  if (result3.suggestedCorrection.photoSelectionPhotographerDueDate !== "2025-12-10") {
    throw new Error(
      `Expected suggested correction date 2025-12-10, got ${result3.suggestedCorrection.photoSelectionPhotographerDueDate}`
    )
  }
  console.log("OK: invalid downstream date — suggestedCorrection set")

  // 4) Handprint scenario — dropoff_plan and low_res_config slots present
  const draftHandprint = minimalDraft(SCENARIO_3_HANDPRINT_ONLY, {
    completedBlockIds: [],
  })
  const result4 = getChronologyConstraints(draftHandprint)
  if (!result4.byBlockId["dropoff_plan_shipping"]) {
    throw new Error("Expected dropoff_plan_shipping in handprint scenario")
  }
  if (!result4.byBlockId["low_res_config"]) {
    throw new Error("Expected low_res_config in handprint scenario")
  }
  if (!result4.byBlockId["handprint_high_res_config"]) {
    throw new Error("Expected handprint_high_res_config in handprint scenario (not lr_to_hr_setup)")
  }
  console.log("OK: handprint scenario — dropoff, low_res, handprint_high_res slots present")

  console.log("All chronology constraint checks passed.")
}

runChronologyAssertions()
