/**
 * Unit checks for Digital vs Analog photographer_selection_deadline_missed guards.
 * Run: npx tsx lib/services/notifications/__tests__/deadline-missed-guards-check.ts
 */
import { isPhotographerSelectionMissedPrerequisiteMet } from "../deadline-missed-guards"

let failed = 0
function check(name: string, pass: boolean) {
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}`)
  if (!pass) failed++
}

// Digital
check(
  "Digital + shooting_completed_confirmed → allow",
  isPhotographerSelectionMissedPrerequisiteMet("digital", ["shooting_completed_confirmed"])
)
check(
  "Digital without shooting confirm → block",
  !isPhotographerSelectionMissedPrerequisiteMet("digital", ["shooting_ended"])
)
check(
  "Digital + scanning_completed only → block (must not use Analog prereq)",
  !isPhotographerSelectionMissedPrerequisiteMet("digital", ["scanning_completed"])
)
check(
  "Digital + confirm + uploaded → block",
  !isPhotographerSelectionMissedPrerequisiteMet("digital", [
    "shooting_completed_confirmed",
    "photographer_selection_uploaded",
  ])
)

// Analog
check(
  "Analog + scanning_completed → allow",
  isPhotographerSelectionMissedPrerequisiteMet("analog", ["scanning_completed"])
)
check(
  "Analog + shooting_completed_confirmed only → block (must not loosen Analog)",
  !isPhotographerSelectionMissedPrerequisiteMet("analog", ["shooting_completed_confirmed"])
)
check(
  "Analog without scanning → block",
  !isPhotographerSelectionMissedPrerequisiteMet("analog", ["dropoff_confirmed"])
)
check(
  "Analog + scanning + uploaded → block",
  !isPhotographerSelectionMissedPrerequisiteMet("analog", [
    "scanning_completed",
    "photographer_selection_uploaded",
  ])
)

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log("\nAll deadline-missed guard checks passed.")
