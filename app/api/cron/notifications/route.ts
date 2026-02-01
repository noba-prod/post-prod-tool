/**
 * POST /api/cron/notifications
 * Cron endpoint for processing scheduled notifications
 * 
 * This endpoint is called by Vercel Cron every minute to:
 * 1. Process pending scheduled notifications
 * 2. Send pending email notifications
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
    // Verify cron secret (Vercel sends this header for cron jobs)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
