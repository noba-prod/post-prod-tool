/**
 * Domain check: for each PHOTO scenario, computeCreationTemplate(config) returns
 * exactly the expected step IDs. Run with: npx tsx lib/domain/collections/__tests__/scenario-matrix-check.ts
 */

import { computeCreationTemplate } from "../workflow"
import { SCENARIO_MATRIX } from "../scenario-matrix"

function runScenarioAssertions(): void {
  let failed = 0
  for (const { name, config, expectedStepIds } of SCENARIO_MATRIX) {
    const steps = computeCreationTemplate(config)
    const got = steps.map((s) => s.stepId)
    const ok =
      got.length === expectedStepIds.length &&
      got.every((id, i) => id === expectedStepIds[i])
    if (!ok) {
      console.error(
        `FAIL ${name}: got [${got.join(", ")}], expected [${expectedStepIds.join(", ")}]`
      )
      failed++
    } else {
      console.log(`OK ${name}`)
    }
  }
  if (failed > 0) {
    throw new Error(`Scenario check failed: ${failed} scenario(s)`)
  }
  console.log("All PHOTO scenarios passed.")
}

runScenarioAssertions()
