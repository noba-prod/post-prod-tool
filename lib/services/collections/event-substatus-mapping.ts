/**
 * Maps collection_events.event_type to collections.substatus updates.
 * Keeps the linear substatus flow in sync when events are triggered.
 *
 * Linear substatus order (from 030_collections_substatus.sql):
 * shooting → negatives_drop_off → low_res_scanning → photographer_selection
 * → client_selection → low_res_to_high_res → edition_request → final_edits
 * → photographer_last_check → client_confirmation (then status → completed)
 */

import type { CollectionSubstatus } from "@/lib/domain/collections"
import type { CollectionEventType } from "@/lib/services/notifications/notifications.interface"

export type SubstatusAdvanceResult =
  | { action: "advance"; substatus: CollectionSubstatus }
  | { action: "revert"; substatus: CollectionSubstatus }
  | { action: "complete" }
  | { action: "cancel" }
  | { action: "none" }

/**
 * Events that advance substatus to the next step (completion of current stage).
 * _started, _deadline_missed, and informational events do not advance (action: "none").
 */
const EVENT_TO_SUBSTATUS_ADVANCE: Record<
  CollectionEventType,
  SubstatusAdvanceResult
> = {
  // Shooting: ended → move to negatives_drop_off
  shooting_started: { action: "none" },
  shooting_ended: { action: "advance", substatus: "negatives_drop_off" },

  // Negatives / drop-off: pickup marked completes shooting → advance to negatives_drop_off
  negatives_pickup_marked: { action: "advance", substatus: "negatives_drop_off" },
  dropoff_confirmed: { action: "advance", substatus: "low_res_scanning" },
  dropoff_deadline_missed: { action: "none" },

  // Scanning
  scanning_started: { action: "none" },
  scanning_completed: { action: "advance", substatus: "photographer_selection" },
  scanning_deadline_missed: { action: "none" },
  lab_shared_additional_materials: { action: "none" },

  // Photographer selection: uploaded completes the step → advance to client_selection
  photographer_selection_uploaded: { action: "advance", substatus: "client_selection" },
  photographer_selection_shared: { action: "none" },
  photographer_selection_deadline_missed: { action: "none" },
  // Missing photos: revert from photographer_selection/client_selection back to low_res_scanning
  photographer_requested_additional_photos: { action: "revert", substatus: "low_res_scanning" },
  photographer_request_missing_photos: { action: "none" },
  client_request_missing_photos: { action: "none" },

  // Client selection
  client_selection_started: { action: "none" },
  client_selection_confirmed: { action: "advance", substatus: "low_res_to_high_res" },
  client_selection_deadline_missed: { action: "none" },

  // Photographer review (validates client selection — step 6): advances to low-res to high-res
  photographer_check_approved: { action: "advance", substatus: "low_res_to_high_res" },
  photographer_check_deadline_missed: { action: "none" },

  // High-res
  highres_started: { action: "none" },
  highres_ready: { action: "advance", substatus: "edition_request" },
  highres_deadline_missed: { action: "none" },

  // Edition
  edition_request_submitted: { action: "advance", substatus: "final_edits" },
  edition_request_deadline_missed: { action: "none" },

  // Final edits
  final_edits_started: { action: "none" },
  final_edits_completed: { action: "advance", substatus: "photographer_last_check" },
  final_edits_deadline_missed: { action: "none" },
  retouch_studio_shared_additional_materials: { action: "none" },

  // Photographer last check
  photographer_review_started: { action: "none" },
  photographer_edits_approved: { action: "advance", substatus: "client_confirmation" },
  photographer_review_deadline_missed: { action: "none" },

  // Client confirmation (step 11)
  client_confirmation_confirmed: { action: "complete" },

  // Final events
  collection_completed: { action: "complete" },
  collection_cancelled: { action: "cancel" },
}

/**
 * Returns the substatus action to apply when this event is triggered.
 * - advance: update collection substatus to the given value (validated as next in sequence).
 * - complete: set status to completed and substatus to null (same as advancing to client_confirmation).
 * - cancel: set status to canceled and substatus to null.
 * - none: do not change substatus.
 */
export function getSubstatusAdvanceForEvent(
  eventType: CollectionEventType
): SubstatusAdvanceResult {
  return EVENT_TO_SUBSTATUS_ADVANCE[eventType] ?? { action: "none" }
}
