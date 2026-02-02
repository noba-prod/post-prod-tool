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
 *    - Request method: GET or POST
 *    - Header: Authorization: Bearer <your-CRON_SECRET>
 * 3. Set CRON_SECRET in Vercel environment variables
 * 
 * Security: Protected by CRON_SECRET header
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { NotificationsService } from "@/lib/services/notifications"

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

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (cron-job.org sends Authorization: Bearer <CRON_SECRET>)
    const rawHeader = request.headers.get("authorization")
    const authHeader = rawHeader?.trim() ?? ""
    const cronSecret = (process.env.CRON_SECRET ?? "").trim()

    if (!cronSecret) {
      console.warn("[Cron] CRON_SECRET not set for this environment (set it for Preview if using a branch URL)")
      return NextResponse.json(
        { error: "Unauthorized", hint: "CRON_SECRET is not configured for this deployment (check Vercel env: Production vs Preview)." },
        { status: 401 }
      )
    }

    const expected = `Bearer ${cronSecret}`
    if (authHeader !== expected) {
      const hasHeader = rawHeader != null
      console.warn("[Cron] Unauthorized: header present =", hasHeader, "format OK =", authHeader.startsWith("Bearer "))
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint: "Use header: Authorization = Bearer <CRON_SECRET> (exact value, no extra spaces). For branch/preview URLs, set CRON_SECRET in Vercel for 'Preview' environment.",
        },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()
    const notificationsService = new NotificationsService(supabase)

    const startTime = Date.now()
    const result = await notificationsService.processScheduledNotifications()
    const duration = Date.now() - startTime

    console.log(
      `[Cron] Processed ${result.processed} notifications with ${result.errors} errors in ${duration}ms`
    )

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      duration,
    })
  } catch (error) {
    console.error("[Cron] Error processing notifications:", error)
    return NextResponse.json(
      { error: "Failed to process notifications" },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
