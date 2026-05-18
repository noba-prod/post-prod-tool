/**
 * POST /api/collections/[id]/apply-workflow-change
 *
 * Applies a *structural* workflow reconfiguration (plan §3, Option A).
 * Distinct from `save-changes`:
 *   • this endpoint MUST be used when any key in `STRUCTURAL_CONFIG_KEYS`
 *     differs vs. the persisted config (type of shoot, agency, edition,
 *     handprint variant, etc.).
 *   • Triggers the migration pipeline + in-app notification (§17).
 *
 * Body:
 *   {
 *     config: CollectionConfig,                          // full new config
 *     expectedUpdatedAt?: string                         // optimistic lock
 *   }
 *
 * Response (200):
 *   {
 *     success: true,
 *     wasPublished: boolean,
 *     reconciliation: { ... }                            // diff summary for UI
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"
import { NotificationsService } from "@/lib/services/notifications/notifications.service"
import { CollectionsServiceError } from "@/lib/services/collections"
import { checkInternalUserCollectionMutationScope } from "@/lib/services/collections/internal-scope-guard"
import { getDeadlineDbColumnsToClear } from "@/lib/services/collections/structural-purge-db"
import {
  getEventTypesToPurgeForRemovedSteps,
  type CollectionConfig,
} from "@/lib/domain/collections"
import {
  isStructuralReconfigEnabled,
  isUserInStructuralReconfigCohort,
  logStructuralReconfigEvent,
} from "@/lib/services/collections/structural-reconfig-feature"

interface ApplyWorkflowChangeBody {
  config?: CollectionConfig
  expectedUpdatedAt?: string
}

function extractMissingColumnFromErrorMessage(message: string | undefined): string | null {
  if (!message) return null
  const match = message.match(/Could not find the '([^']+)' column/)
  return match?.[1] ?? null
}

/** Update collections row with a payload, retrying after dropping unknown columns
 *  (e.g. when the remote schema cache hasn't yet picked up workflow_revision). */
async function updateCollectionsWithColumnFallback(
  admin: ReturnType<typeof createAdminClient>,
  collectionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const nextPayload: Record<string, unknown> = { ...payload }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { error } = await admin
      .from("collections")
      .update(nextPayload as never)
      .eq("id", collectionId)
    if (!error) return
    const missingColumn = extractMissingColumnFromErrorMessage(
      (error as { message?: string }).message
    )
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw error
    }
    delete nextPayload[missingColumn]
    console.warn(
      `[apply-workflow-change] Skipping missing column "${missingColumn}" and retrying.`
    )
  }
  throw new Error("Failed to update collection after column-fallback retries")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scope = await checkInternalUserCollectionMutationScope(user.id, collectionId)
    if (!scope.canMutate) {
      return NextResponse.json(
        { error: "Forbidden: internal users must be invited to edit this collection." },
        { status: 403 }
      )
    }

    // Feature gate (plan §13 Phase 4). Server-side only so we can flip it
    // without redeploying clients. We never read these env vars at module
    // load to keep tests deterministic.
    if (!isStructuralReconfigEnabled() || !isUserInStructuralReconfigCohort(user.id)) {
      logStructuralReconfigEvent({
        event: "feature_disabled",
        collectionId,
        userId: user.id,
      })
      return NextResponse.json(
        {
          error:
            "Structural workflow reconfiguration is temporarily disabled. Contact noba support if you need to change the workflow of this collection.",
          code: "FEATURE_DISABLED",
        },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => null)) as ApplyWorkflowChangeBody | null
    if (!body?.config) {
      return NextResponse.json(
        { error: "config is required" },
        { status: 400 }
      )
    }

    const service = createCollectionsServiceForServer()
    let result: Awaited<ReturnType<typeof service.applyStructuralWorkflowChange>>
    try {
      result = await service.applyStructuralWorkflowChange(collectionId, body.config, {
        expectedUpdatedAt: body.expectedUpdatedAt,
      })
    } catch (err) {
      if (err instanceof CollectionsServiceError) {
        const status =
          err.code === "NOT_FOUND"
            ? 404
            : err.code === "VERSION_MISMATCH"
              ? 409
              : err.code === "NO_OP"
                ? 422
                : err.code === "INVALID_STATUS"
                  ? 409
                  : 500
        logStructuralReconfigEvent({
          event: "rejected",
          collectionId,
          userId: user.id,
          errorCode: err.code,
          errorMessage: err.message,
        })
        return NextResponse.json({ error: err.message, code: err.code }, { status })
      }
      throw err
    }

    const { reconciliation, wasPublished } = result
    const removedSteps = reconciliation.purge.removedViewStepIds
    const admin = createAdminClient()

    // ---- 1. Raw column purge for inactive-step deadline fields. The repository
    //         mapper interprets `undefined` as "skip"; admin client NULL writes
    //         are the only reliable way to clear date/time string columns.
    if (removedSteps.length > 0) {
      const { nullColumns, emptyJsonbColumns } = getDeadlineDbColumnsToClear(removedSteps)
      if (nullColumns.length > 0 || emptyJsonbColumns.length > 0) {
        const purgePayload: Record<string, unknown> = {}
        for (const col of nullColumns) purgePayload[col] = null
        for (const col of emptyJsonbColumns) purgePayload[col] = []
        purgePayload.updated_at = new Date().toISOString()
        try {
          await updateCollectionsWithColumnFallback(admin, collectionId, purgePayload)
        } catch (purgeErr) {
          console.error("[apply-workflow-change] Deadline column purge failed:", purgeErr)
          logStructuralReconfigEvent({
            event: "cleanup_failed",
            collectionId,
            userId: user.id,
            errorMessage: purgeErr instanceof Error ? purgeErr.message : String(purgeErr),
          })
          // Best-effort: log and continue. The new step_statuses already exclude
          // these steps from the visible workflow, so stale dates won't surface
          // in UI; they just stay as dead data until next safe-edit.
        }
      }

      // ---- 2. Event log + notification cleanup scoped to removed steps.
      const eventTypesToPurge = getEventTypesToPurgeForRemovedSteps(removedSteps)
      if (eventTypesToPurge.length > 0) {
        const { error: eventsErr } = await admin
          .from("collection_events")
          .delete()
          .eq("collection_id", collectionId)
          .in("event_type", eventTypesToPurge)
        if (eventsErr) {
          console.warn("[apply-workflow-change] Failed to delete collection_events:", eventsErr)
        }
      }

      const stepsToClean = reconciliation.purge.notificationTemplateStepsToClean
      if (stepsToClean.length > 0) {
        const { data: templates, error: tplErr } = await admin
          .from("notification_templates")
          .select("id")
          .in("step", stepsToClean)
        if (tplErr) {
          console.warn("[apply-workflow-change] Failed to load templates:", tplErr)
        } else if (templates && templates.length > 0) {
          const templateIds = (templates as { id: string }[]).map((t) => t.id)

          // Delete unread/sent notifications for these templates. Already-read
          // notifications are preserved as historical record (plan §5.1).
          const { error: notifErr } = await admin
            .from("notifications")
            .delete()
            .eq("collection_id", collectionId)
            .in("template_id", templateIds)
            .neq("status", "read")
          if (notifErr) {
            console.warn("[apply-workflow-change] Failed to delete notifications:", notifErr)
          }

          // Drop scheduled tracking rows for the removed steps so the cron
          // doesn't re-fire orphan reminders.
          const { error: trackErr } = await admin
            .from("scheduled_notification_tracking")
            .delete()
            .eq("collection_id", collectionId)
            .in("template_id", templateIds)
          if (trackErr) {
            console.warn(
              "[apply-workflow-change] Failed to delete scheduled tracking:",
              trackErr
            )
          }
        }
      }
    }

    // ---- 3. Workflow revision counter (migration 083). Read-modify-write is
    //         safe because applyStructuralWorkflowChange is producer-driven and
    //         rare; collisions are not a concern.
    let nextRevision = 0
    try {
      const { data: revRow } = await admin
        .from("collections")
        .select("workflow_revision")
        .eq("id", collectionId)
        .single()
      const current = (revRow as { workflow_revision?: number | null } | null)?.workflow_revision ?? 0
      nextRevision = (current ?? 0) + 1
      await updateCollectionsWithColumnFallback(admin, collectionId, {
        workflow_revision: nextRevision,
      })
    } catch (revErr) {
      console.warn(
        "[apply-workflow-change] workflow_revision bump skipped (column may be missing):",
        revErr
      )
    }

    // ---- 4. In-app notification (plan §17). Fire-and-await via the same admin
    //         NotificationsService the service factory uses for publish, so the
    //         standard pipeline (template → recipient resolution → in-app rows)
    //         runs identically.
    try {
      const notifications = new NotificationsService(admin)
      const idempotencyKey = `wfreconfig:${collectionId}:${nextRevision}`
      await notifications.triggerEvent(
        collectionId,
        "collection_workflow_reconfigured",
        user.id,
        {
          workflowRevision: nextRevision,
          changedKeys: reconciliation.diff.changedKeys,
          removedViewStepIds: removedSteps,
          addedViewStepIds: reconciliation.viewStepDiff.added,
          wasPublished,
        },
        { idempotencyKey }
      )
    } catch (notifErr) {
      console.warn(
        "[apply-workflow-change] collection_workflow_reconfigured event failed (non-fatal):",
        notifErr
      )
      logStructuralReconfigEvent({
        event: "notification_failed",
        collectionId,
        userId: user.id,
        errorMessage: notifErr instanceof Error ? notifErr.message : String(notifErr),
      })
    }

    const remediation = {
      changedKeys: reconciliation.diff.changedKeys,
      removedViewStepIds: reconciliation.viewStepDiff.removed,
      addedViewStepIds: reconciliation.viewStepDiff.added,
      missingRequiredRoles: reconciliation.participants.missingRequiredRoles,
      orphanedRoles: reconciliation.participants.orphanedRoles,
      newRequiredRoles: reconciliation.participants.nowRequiredRoles,
      completedBlockIds: reconciliation.completedBlockIds,
      completionPercentage: reconciliation.completionPercentage,
      notificationTemplateStepsCleaned: reconciliation.purge.notificationTemplateStepsToClean,
    }

    logStructuralReconfigEvent({
      event: "applied",
      collectionId,
      userId: user.id,
      wasPublished,
      workflowRevision: nextRevision,
      changedKeys: reconciliation.diff.changedKeys,
      removedViewStepIds: reconciliation.viewStepDiff.removed,
      addedViewStepIds: reconciliation.viewStepDiff.added,
      missingRequiredRoles: reconciliation.participants.missingRequiredRoles,
      orphanedRoles: reconciliation.participants.orphanedRoles,
    })

    return NextResponse.json({
      success: true,
      wasPublished,
      workflowRevision: nextRevision,
      reconciliation: remediation,
      message: wasPublished
        ? "Workflow updated. Collection moved to draft until you republish."
        : "Workflow updated.",
    })
  } catch (error) {
    console.error("[POST /api/collections/[id]/apply-workflow-change] Error:", error)
    return NextResponse.json(
      { error: "Failed to apply workflow change" },
      { status: 500 }
    )
  }
}
