/**
 * POST /api/cron/notifications
 * Cron endpoint for processing scheduled notifications
 *
 * Called every minute by cron-job.org (free external cron service)
 * to process time-based notifications (deadline reminders, etc.)
 *
 * Setup instructions for cron-job.org:
 * 1. Go to https://cron-job.org and create a free account
 * 2. Create a new cron job with:
 *    - URL: https://your-domain.vercel.app/api/cron/notifications
 *    - Schedule: Every 1 minute
 *    - Request method: POST (preferred) or GET
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
      // Detailed debug logging to diagnose auth issues
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

    const startTime = Date.now()
    const result = await notificationsService.processScheduledNotifications()
    const duration = Date.now() - startTime

    console.log(
      `[Cron] Processed ${result.processed} notifications with ${result.errors} errors in ${duration}ms`
    )

    return NextResponse.json(
      {
        success: true,
        processed: result.processed,
        errors: result.errors,
        duration,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error("[Cron] Error processing notifications:", error)
    return NextResponse.json(
      { error: "Failed to process notifications" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
