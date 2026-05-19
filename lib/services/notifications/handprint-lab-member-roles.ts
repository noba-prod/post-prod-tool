/**
 * Pure helper: which collection_members.role values to query when a notification
 * template targets the `handprint_lab` recipient bucket.
 *
 * Must stay aligned with workflow ownership (handprintIsDifferentLab) and
 * collections.handprint_different_from_original_lab / handprint_lab_id.
 */

export type CollectionLabAssignment = {
  photo_lab_id: string | null
  handprint_lab_id: string | null
  handprint_different_from_original_lab: boolean
}

export type HandprintLabMemberRole = "handprint_lab" | "photo_lab"

/**
 * When the photo lab also owns high-res (flag false), only `photo_lab` members
 * should be notified — even if handprint_lab_id is stale in the DB.
 *
 * When org IDs match, query both roles (members may be stored as either).
 */
export function memberRolesForHandprintLabBucket(
  collection: CollectionLabAssignment
): HandprintLabMemberRole[] {
  const hasPhotoLab = Boolean(collection.photo_lab_id)
  const hasHandprintLab = Boolean(collection.handprint_lab_id)

  if (!hasPhotoLab && !hasHandprintLab) {
    return []
  }

  if (collection.handprint_different_from_original_lab === false && hasPhotoLab) {
    return ["photo_lab"]
  }

  const orgIdsMatch =
    hasPhotoLab &&
    hasHandprintLab &&
    collection.handprint_lab_id === collection.photo_lab_id

  if (orgIdsMatch) {
    return ["handprint_lab", "photo_lab"]
  }

  if (hasHandprintLab) {
    return ["handprint_lab"]
  }

  return ["photo_lab"]
}
