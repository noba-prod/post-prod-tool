/**
 * POST /api/cron/notifications
 * Cron endpoint for processing scheduled notifications
 *
 * Called every minute by cron-job.org (free external cron service)
 * to process time-based notifications (deadline reminders, etc.)
 *
 * Each run is time-budgeted (~12s) and batch-capped so the response stays under
 * cron-job.org's 30s timeout. Remaining due work is left for subsequent ticks.
 * A DB lock prevents overlapping runs when the previous tick is still active.
 *
 * Setup instructions for cron-job.org:
 * 1. Go to https://cron-job.org and create a free account
 * 2. Create a new cron job with:
 *    - URL: https://your-domain.vercel.app/api/cron/notifications
 *    - Schedule: Every 1 minute
 *    - Request method: POST (preferred) or GET
 *    - Request timeout: 30s (or higher if the plan allows)
 *    - Auth option A: Request header → Name: Authorization, Value: Bearer <CRON_SECRET>
 *    - Auth option B: Add ?secret=<CRON_SECRET> to the URL (only accepted when User-Agent is cron-job.org)
 * 3. Set CRON_SECRET in Vercel env vars (Production + Preview if using branch URLs)
 *
 * Security: Protected by CRON_SECRET (header or query when from cron-job.org). No caching.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { NotificationsService } from "@/lib/services/notifications"

// Prevent Vercel from caching 401 or any response (cache was serving stale 401)
export const dynamic = "force-dynamic"
export const revalidate = 0
/** Allow a full minute on Vercel; we still return early under the external 30s timeout. */
export const maxDuration = 60

const CRON_TIME_BUDGET_MS = 12_000

// Create a service role client for cron jobs (bypasses RLS)
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase configuration for cron job")
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0",
} as const

function unauthorized(body: object) {
  return NextResponse.json(body, { status: 401, headers: NO_CACHE_HEADERS })
}

export async function POST(request: NextRequest) {
  const runId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `cron-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    const cronSecret = (process.env.CRON_SECRET ?? "").trim()
    const rawHeader = request.headers.get("authorization")
    const authHeader = rawHeader?.trim() ?? ""
    const userAgent = request.headers.get("user-agent") ?? ""
    const isCronJobOrg = userAgent.includes("cron-job.org")
    const querySecretRaw = request.nextUrl.searchParams.get("secret")
    const querySecret = (querySecretRaw ? decodeURIComponent(querySecretRaw) : "").trim()

    // Accept: (1) Authorization: "Bearer <secret>" or "<secret>", or (2) ?secret= when from cron-job.org
    const headerOk =
      cronSecret &&
      (authHeader === `Bearer ${cronSecret}` || authHeader === cronSecret)
    const queryOk = cronSecret && isCronJobOrg && querySecret === cronSecret
    const authenticated = headerOk || queryOk

    if (!cronSecret) {
      console.warn("[Cron] CRON_SECRET not set for this environment (set it for Preview if using a branch URL)")
      return unauthorized({
        error: "Unauthorized",
        hint: "CRON_SECRET is not configured for this deployment (check Vercel env: Production vs Preview).",
      })
    }

    if (!authenticated) {
      console.warn("[Cron] Unauthorized request details:", {
        cronSecretLength: cronSecret.length,
        cronSecretFirst3: cronSecret.slice(0, 3),
        rawHeader,
        authHeader,
        authHeaderLength: authHeader.length,
        expectedBearer: `Bearer ${cronSecret}`,
        expectedBearerLength: `Bearer ${cronSecret}`.length,
        headerMatchesBearer: authHeader === `Bearer ${cronSecret}`,
        headerMatchesRaw: authHeader === cronSecret,
        querySecret,
        querySecretLength: querySecret.length,
        isCronJobOrg,
        userAgent,
      })
      return unauthorized({
        error: "Unauthorized",
        hint: "Use Authorization header (Bearer <CRON_SECRET>) in cron-job.org ADVANCED tab, or URL with ?secret=<CRON_SECRET>. Set CRON_SECRET for Preview if using branch URL.",
        debug: {
          cronSecretSet: !!cronSecret,
          cronSecretLength: cronSecret.length,
          authHeaderPresent: rawHeader != null,
          authHeaderReceived: rawHeader ? `${rawHeader.slice(0, 10)}...` : null,
          authHeaderLength: authHeader.length,
          querySecretPresent: !!querySecret,
          fromCronJobOrg: isCronJobOrg,
        },
      })
    }

    const supabase = createServiceClient()
    const notificationsService = new NotificationsService(supabase)

    const acquired = await notificationsService.tryAcquireCronLock(runId)
    if (!acquired) {
      // #region agent log
      fetch('http://127.0.0.1:7416/ingest/ffb25ca4-9c3e-4858-8478-191a76929d4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'639fba'},body:JSON.stringify({sessionId:'639fba',runId,hypothesisId:'A',location:'cron/notifications/route.ts:lock-skip',message:'cron skipped — lock held',data:{runId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          reason: "lock_held",
          runId,
          duration: 0,
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    const startTime = Date.now()

    try {
      // #region agent log
      fetch('http://127.0.0.1:7416/ingest/ffb25ca4-9c3e-4858-8478-191a76929d4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'639fba'},body:JSON.stringify({sessionId:'639fba',runId,hypothesisId:'A',location:'cron/notifications/route.ts:auth-ok',message:'cron authenticated, starting run',data:{runId,timeBudgetMs:CRON_TIME_BUDGET_MS},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // 1. Re-schedule for collections updated in the last 5 minutes (catches deadline changes)
      const rescheduleResult = await notificationsService.rescheduleForUpdatedCollections()

      // 2. Detect missed deadlines and fire events (budget-aware)
      const missedResult = await notificationsService.detectAndFireMissedDeadlines({
        startedAt: startTime,
        timeBudgetMs: CRON_TIME_BUDGET_MS,
      })

      // 3. Process scheduled notifications + pending deliveries (budget-aware)
      const result = await notificationsService.processScheduledNotifications({
        startedAt: startTime,
        timeBudgetMs: CRON_TIME_BUDGET_MS,
      })
      const duration = Date.now() - startTime
      const truncated = missedResult.truncated || result.truncated

      // #region agent log
      fetch('http://127.0.0.1:7416/ingest/ffb25ca4-9c3e-4858-8478-191a76929d4c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'639fba'},body:JSON.stringify({sessionId:'639fba',runId,hypothesisId:'A',location:'cron/notifications/route.ts:done',message:'cron finished',data:{runId,rescheduled:rescheduleResult.rescheduled,missedFired:missedResult.fired,missedTruncated:missedResult.truncated,processed:result.processed,scheduledProcessed:result.scheduledProcessed,deliveriesProcessed:result.deliveriesProcessed,remainingScheduled:result.remainingScheduled,truncated,errors:result.errors,duration},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      console.log(
        `[Cron:${runId}] Rescheduled ${rescheduleResult.rescheduled}, missed=${missedResult.fired}` +
          `${missedResult.truncated ? "(trunc)" : ""}, processed=${result.processed}` +
          ` (sched=${result.scheduledProcessed}, del=${result.deliveriesProcessed},` +
          ` remaining=${result.remainingScheduled}${truncated ? ", truncated" : ""})` +
          ` errors=${result.errors} in ${duration}ms`
      )

      return NextResponse.json(
        {
          success: true,
          skipped: false,
          rescheduled: rescheduleResult.rescheduled,
          missedDeadlinesFired: missedResult.fired,
          missedDeadlinesTruncated: missedResult.truncated,
          processed: result.processed,
          scheduledProcessed: result.scheduledProcessed,
          deliveriesProcessed: result.deliveriesProcessed,
          remainingScheduled: result.remainingScheduled,
          truncated,
          errors: result.errors,
          duration,
          runId,
        },
        { headers: NO_CACHE_HEADERS }
      )
    } finally {
      await notificationsService.releaseCronLock(runId)
    }
  } catch (error) {
    console.error("[Cron] Error processing notifications:", error)
    return NextResponse.json(
      { error: "Failed to process notifications", runId },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
