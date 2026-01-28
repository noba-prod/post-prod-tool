/**
 * PHOTO scenario matrix — explicit config → expected step IDs for computeCreationTemplate.
 * Source: PHOTO (Collection configuration → Sidebar steps). Run check with:
 *   npx tsx lib/domain/collections/__tests__/scenario-matrix-check.ts
 */

import type { CollectionConfig } from "./types"
import type { CreationBlockId } from "./types"

function minimalConfig(overrides: Partial<CollectionConfig>): CollectionConfig {
  return {
    name: "Test",
    clientEntityId: "c1",
    managerUserId: "u1",
    hasAgency: false,
    hasLowResLab: false,
    hasHandprint: false,
    handprintIsDifferentLab: false,
    hasEditionStudio: false,
    ...overrides,
  }
}

/** Scenario 1: Digital Only — PHOTO green steps */
export const SCENARIO_1_DIGITAL_ONLY: CollectionConfig = minimalConfig({
  hasLowResLab: true,
  hasHandprint: false,
})
export const EXPECTED_STEPS_1: CreationBlockId[] = [
  "participants",
  "shooting_setup",
  "photo_selection",
  "lr_to_hr_setup",
  "check_finals",
]

/** Scenario 2: Digital + Photographer request edition */
export const SCENARIO_2_DIGITAL_EDITION: CollectionConfig = minimalConfig({
  hasLowResLab: true,
  hasHandprint: false,
  hasEditionStudio: true,
})
export const EXPECTED_STEPS_2: CreationBlockId[] = [
  "participants",
  "shooting_setup",
  "photo_selection",
  "lr_to_hr_setup",
  "edition_config",
  "check_finals",
]

/** Scenario 3: Handprint Only */
export const SCENARIO_3_HANDPRINT_ONLY: CollectionConfig = minimalConfig({
  hasLowResLab: false,
  hasHandprint: true,
  handprintIsDifferentLab: false,
})
export const EXPECTED_STEPS_3: CreationBlockId[] = [
  "participants",
  "shooting_setup",
  "dropoff_plan",
  "low_res_config",
  "photo_selection",
  "handprint_high_res_config",
  "check_finals",
]

/** Scenario 4: Handprint + Edition */
export const SCENARIO_4_HANDPRINT_EDITION: CollectionConfig = minimalConfig({
  hasLowResLab: false,
  hasHandprint: true,
  handprintIsDifferentLab: false,
  hasEditionStudio: true,
})
export const EXPECTED_STEPS_4: CreationBlockId[] = [
  "participants",
  "shooting_setup",
  "dropoff_plan",
  "low_res_config",
  "photo_selection",
  "handprint_high_res_config",
  "edition_config",
  "check_finals",
]

/** Scenario 5: Handprint + Handprint different lab */
export const SCENARIO_5_HANDPRINT_DIFF_LAB: CollectionConfig = minimalConfig({
  hasLowResLab: false,
  hasHandprint: true,
  handprintIsDifferentLab: true,
})
export const EXPECTED_STEPS_5: CreationBlockId[] = [
  "participants",
  "shooting_setup",
  "dropoff_plan",
  "low_res_config",
  "photo_selection",
  "handprint_high_res_config",
  "check_finals",
]

/** Scenario 6: Handprint + Edition + Handprint different lab */
export const SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB: CollectionConfig =
  minimalConfig({
    hasLowResLab: false,
    hasHandprint: true,
    handprintIsDifferentLab: true,
    hasEditionStudio: true,
  })
export const EXPECTED_STEPS_6: CreationBlockId[] = [
  "participants",
  "shooting_setup",
  "dropoff_plan",
  "low_res_config",
  "photo_selection",
  "handprint_high_res_config",
  "edition_config",
  "check_finals",
]

export const SCENARIO_MATRIX: Array<{
  name: string
  config: CollectionConfig
  expectedStepIds: CreationBlockId[]
}> = [
  { name: "1 Digital Only", config: SCENARIO_1_DIGITAL_ONLY, expectedStepIds: EXPECTED_STEPS_1 },
  { name: "2 Digital + Edition", config: SCENARIO_2_DIGITAL_EDITION, expectedStepIds: EXPECTED_STEPS_2 },
  { name: "3 Handprint Only", config: SCENARIO_3_HANDPRINT_ONLY, expectedStepIds: EXPECTED_STEPS_3 },
  { name: "4 Handprint + Edition", config: SCENARIO_4_HANDPRINT_EDITION, expectedStepIds: EXPECTED_STEPS_4 },
  { name: "5 Handprint + Diff Lab", config: SCENARIO_5_HANDPRINT_DIFF_LAB, expectedStepIds: EXPECTED_STEPS_5 },
  { name: "6 Handprint + Edition + Diff Lab", config: SCENARIO_6_HANDPRINT_EDITION_DIFF_LAB, expectedStepIds: EXPECTED_STEPS_6 },
]
