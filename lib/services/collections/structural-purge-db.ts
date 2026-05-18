/**
 * Service-layer adapter: maps removed view-step ids → DB snake_case columns
 * that must be NULLed by the admin client during a structural reconfiguration.
 *
 * Why this lives in `lib/services/collections/` (not in domain):
 *   The domain layer exports purge intent in *camelCase domain field names*
 *   (see `STRUCTURAL_CONFIG_KEYS`, `getStepArtifactPurgePatch`). The
 *   `mapDomainPatchToDbUpdate` adapter cannot translate "clear" via `undefined`
 *   for date/time string fields because it interprets `undefined` as "skip".
 *   The structural reconfiguration route therefore issues a single raw admin
 *   UPDATE listing these snake_case columns explicitly. This file is the only
 *   place that owns that mapping.
 *
 * Source-of-truth alignment:
 *   • Each column name must exist as a real DB column (see migration trail
 *     starting in `003_collections.sql`).
 *   • The CollectionConfig deadline fields they back are listed in
 *     `lib/utils/collection-mappers.ts` (`mapDomainPatchToDbUpdate`).
 */

import type { ViewStepId } from "@/lib/domain/collections"

interface DeadlineColumnsForStep {
  /** Snake-case columns nullified when the step becomes inactive. */
  dbColumns: readonly string[]
}

const DEADLINE_DB_COLUMNS_BY_VIEW_STEP: Record<ViewStepId, DeadlineColumnsForStep> = {
  shooting: { dbColumns: [] }, // shooting is always active across PHOTO scenarios
  negatives_dropoff: {
    dbColumns: [
      "dropoff_shipping_origin_address",
      "dropoff_shipping_date",
      "dropoff_shipping_time",
      "dropoff_shipping_destination_address",
      "dropoff_delivery_date",
      "dropoff_delivery_time",
      "dropoff_managing_shipping",
      "dropoff_shipping_carrier",
      "dropoff_shipping_tracking",
      "dropoff_additional_shipments",
    ] as const,
  },
  low_res_scanning: {
    dbColumns: [
      "lowres_deadline_date",
      "lowres_deadline_time",
      "lowres_shipping_origin_address",
      "lowres_shipping_date",
      "lowres_shipping_time",
      "lowres_shipping_destination_address",
      "lowres_delivery_date",
      "lowres_delivery_time",
      "lowres_managing_shipping",
      "lowres_shipping_carrier",
      "lowres_shipping_tracking",
    ] as const,
  },
  photographer_selection: {
    dbColumns: [
      "photo_selection_photographer_preselection_date",
      "photo_selection_photographer_preselection_time",
    ] as const,
  },
  client_selection: {
    dbColumns: [
      "photo_selection_client_selection_date",
      "photo_selection_client_selection_time",
    ] as const,
  },
  handprint_high_res: {
    dbColumns: ["low_to_high_date", "low_to_high_time"] as const,
  },
  edition_request: {
    dbColumns: [
      "precheck_photographer_comments_date",
      "precheck_photographer_comments_time",
    ] as const,
  },
  final_edits: {
    dbColumns: [
      "precheck_studio_final_edits_date",
      "precheck_studio_final_edits_time",
    ] as const,
  },
  photographer_last_check: {
    dbColumns: [
      "check_finals_photographer_check_date",
      "check_finals_photographer_check_time",
    ] as const,
  },
  client_confirmation: {
    // project_deadline / check_finals_client_* deliberately preserved: they
    // back the producer-facing finals deadline which exists in every flow
    // (client_confirmation step is always active per view-mode-steps.ts).
    dbColumns: [] as const,
  },
}

/**
 * Returns the list of snake_case columns to NULL via a single raw admin
 * UPDATE when the given view steps are purged.
 *
 * `dropoff_additional_shipments` is JSONB; sending `[]` is the
 * conventional "empty" value (see `parseDropoffAdditionalShipments`).
 */
export function getDeadlineDbColumnsToClear(
  removedViewStepIds: ViewStepId[]
): { nullColumns: string[]; emptyJsonbColumns: string[] } {
  const nullColumns = new Set<string>()
  const emptyJsonbColumns = new Set<string>()
  for (const stepId of removedViewStepIds) {
    for (const col of DEADLINE_DB_COLUMNS_BY_VIEW_STEP[stepId]?.dbColumns ?? []) {
      if (col === "dropoff_additional_shipments") emptyJsonbColumns.add(col)
      else nullColumns.add(col)
    }
  }
  return {
    nullColumns: Array.from(nullColumns),
    emptyJsonbColumns: Array.from(emptyJsonbColumns),
  }
}
