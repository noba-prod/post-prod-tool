/**
 * Feature flag + structured-logging helpers for structural workflow
 * reconfiguration (plan §13 Phase 4).
 *
 * Rollout policy
 * --------------
 * Server-side gate only. Default: **enabled** (the feature is shipped together
 * with this plan). Setting `STRUCTURAL_RECONFIG_ENABLED=false` returns 503 from
 * the apply-workflow-change endpoint. Use this when you need to halt the
 * pipeline (e.g. mid-incident) without redeploying.
 *
 * For per-cohort rollout, accept a comma-separated allowlist of user IDs in
 * `STRUCTURAL_RECONFIG_USER_ALLOWLIST`. When set and non-empty, only those
 * users are permitted to call the endpoint regardless of profile flags.
 *
 * Observability
 * -------------
 * `logStructuralReconfigEvent` emits a structured JSON line via console.log so
 * that any log aggregator (Vercel, Datadog, etc.) can derive:
 *   • `count_structural_migrations` — count of `event=applied` over time
 *   • `count_structural_validation_errors` — count of `event=rejected`
 *   • per-user latency / failure ratios via the `userId` field
 *
 * Keep the schema stable across deployments: dashboards depend on it.
 */

const TRUE_VALUES = new Set(["1", "true", "yes", "on", "enabled"])
const FALSE_VALUES = new Set(["0", "false", "no", "off", "disabled"])

export function isStructuralReconfigEnabled(): boolean {
  const raw = process.env.STRUCTURAL_RECONFIG_ENABLED?.trim().toLowerCase()
  if (!raw) return true
  if (FALSE_VALUES.has(raw)) return false
  if (TRUE_VALUES.has(raw)) return true
  // Unknown values default to enabled — failing open is safer for producers
  // already trained on the new flow than failing closed.
  console.warn(
    `[structural-reconfig-feature] Unknown STRUCTURAL_RECONFIG_ENABLED value "${raw}" — defaulting to enabled`
  )
  return true
}

export function isUserInStructuralReconfigCohort(userId: string): boolean {
  const raw = process.env.STRUCTURAL_RECONFIG_USER_ALLOWLIST?.trim()
  if (!raw) return true // No allowlist configured → everyone allowed
  const allowed = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
  if (allowed.size === 0) return true
  return allowed.has(userId)
}

/**
 * Structured log emitter for rollout dashboards. Use one event per outcome.
 *
 * Event vocabulary (stable):
 *   • `applied` — applyStructuralWorkflowChange succeeded
 *   • `rejected` — service threw a CollectionsServiceError (validation/lock)
 *   • `cleanup_failed` — post-update admin SQL purge failed (best-effort)
 *   • `notification_failed` — collection_workflow_reconfigured trigger threw
 *   • `feature_disabled` — gate blocked the request
 *
 * Fields are intentionally narrow; extend only by adding optional keys (do
 * not rename or remove existing ones — dashboards will break).
 */
export interface StructuralReconfigLogEvent {
  event:
    | "applied"
    | "rejected"
    | "cleanup_failed"
    | "notification_failed"
    | "feature_disabled"
  collectionId: string
  userId: string | null
  wasPublished?: boolean
  workflowRevision?: number
  changedKeys?: string[]
  removedViewStepIds?: string[]
  addedViewStepIds?: string[]
  missingRequiredRoles?: string[]
  orphanedRoles?: string[]
  errorCode?: string
  errorMessage?: string
}

export function logStructuralReconfigEvent(payload: StructuralReconfigLogEvent): void {
  try {
    const line = {
      logger: "structural-reconfig",
      ts: new Date().toISOString(),
      ...payload,
    }
    console.log(`[structural-reconfig] ${JSON.stringify(line)}`)
  } catch (err) {
    console.warn("[structural-reconfig] Failed to emit structured log:", err)
  }
}
