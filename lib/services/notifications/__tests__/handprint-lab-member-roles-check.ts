/**
 * Run with: npm run test:handprint-lab-notifications
 */

import { memberRolesForHandprintLabBucket } from "../handprint-lab-member-roles"

const photoLabId = "f4c764e6-61b0-4580-877a-981b65439b1e"
const labyrinthId = "e958346e-3c71-48e0-b7cc-d769c4a0a72c"

function assertRoles(
  label: string,
  collection: Parameters<typeof memberRolesForHandprintLabBucket>[0],
  expected: ReturnType<typeof memberRolesForHandprintLabBucket>
): void {
  const actual = memberRolesForHandprintLabBucket(collection)
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`${label}: expected ${e}, got ${a}`)
  }
}

function runHandprintLabMemberRolesChecks(): void {
  // Toy Story prod case: flag false, stale handprint_lab_id → photo_lab only
  assertRoles(
    "shared lab flag with mismatched org ids",
    {
      photo_lab_id: photoLabId,
      handprint_lab_id: labyrinthId,
      handprint_different_from_original_lab: false,
    },
    ["photo_lab"]
  )

  assertRoles(
    "shared lab flag with matching org ids",
    {
      photo_lab_id: photoLabId,
      handprint_lab_id: photoLabId,
      handprint_different_from_original_lab: false,
    },
    ["photo_lab"]
  )

  assertRoles(
    "different lab flag with distinct orgs",
    {
      photo_lab_id: photoLabId,
      handprint_lab_id: labyrinthId,
      handprint_different_from_original_lab: true,
    },
    ["handprint_lab"]
  )

  assertRoles(
    "matching org ids without shared flag",
    {
      photo_lab_id: photoLabId,
      handprint_lab_id: photoLabId,
      handprint_different_from_original_lab: true,
    },
    ["handprint_lab", "photo_lab"]
  )

  assertRoles(
    "no handprint_lab_id falls back to photo_lab",
    {
      photo_lab_id: photoLabId,
      handprint_lab_id: null,
      handprint_different_from_original_lab: true,
    },
    ["photo_lab"]
  )

  assertRoles(
    "no labs",
    {
      photo_lab_id: null,
      handprint_lab_id: null,
      handprint_different_from_original_lab: false,
    },
    []
  )

  console.log("OK: handprint-lab-member-roles checks passed")
}

runHandprintLabMemberRolesChecks()
