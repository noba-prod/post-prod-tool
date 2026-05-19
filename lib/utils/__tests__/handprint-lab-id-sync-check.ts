/**
 * Run with: npm run test:handprint-lab-notifications
 */

import {
  mapDomainPatchToDbUpdate,
  resolveSyncedHandprintLabId,
} from "../collection-mappers"

const photoLabId = "f4c764e6-61b0-4580-877a-981b65439b1e"
const labyrinthId = "e958346e-3c71-48e0-b7cc-d769c4a0a72c"

function runHandprintLabIdSyncChecks(): void {
  const synced = resolveSyncedHandprintLabId({
    handprintIsDifferentLab: false,
    photoLabId,
    handprintLabParticipantId: labyrinthId,
  })
  if (synced !== photoLabId) {
    throw new Error(`resolveSyncedHandprintLabId: expected photo lab id, got ${synced}`)
  }

  const update = mapDomainPatchToDbUpdate(
    {
      config: { handprintIsDifferentLab: false },
    },
    {
      existingPhotoLabId: photoLabId,
      existingHandprintIsDifferentLab: true,
    }
  )
  if (update.handprint_lab_id !== photoLabId) {
    throw new Error(
      `mapDomainPatchToDbUpdate config-only: expected handprint_lab_id=${photoLabId}, got ${update.handprint_lab_id}`
    )
  }

  const updateExistingShared = mapDomainPatchToDbUpdate(
    { config: { name: "Toy Story" } },
    {
      existingPhotoLabId: photoLabId,
      existingHandprintIsDifferentLab: false,
    }
  )
  if (updateExistingShared.handprint_lab_id !== photoLabId) {
    throw new Error(
      `mapDomainPatchToDbUpdate unrelated patch with shared lab: expected sync, got ${updateExistingShared.handprint_lab_id}`
    )
  }

  console.log("OK: handprint-lab-id-sync checks passed")
}

runHandprintLabIdSyncChecks()
