/**
 * Server-only collections service factory.
 * Uses admin Supabase client so publish can update scheduled_notification_tracking and run notifications.
 * Import only from API routes or server actions.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { SupabaseCollectionsRepository } from "@/lib/infra/collections/supabase-collections.repository"
import { NotificationsService } from "../notifications/notifications.service"
import { CollectionsService } from "./collections.service"

let serverCollectionsServiceInstance: CollectionsService | null = null

/**
 * Returns a CollectionsService wired to the admin Supabase client.
 * Use this in API routes so that publish runs notifications and scheduled_notification_tracking on the server.
 */
export function createCollectionsServiceForServer(): CollectionsService {
  if (!serverCollectionsServiceInstance) {
    const admin = createAdminClient()
    serverCollectionsServiceInstance = new CollectionsService(
      new SupabaseCollectionsRepository(admin),
      new NotificationsService(admin)
    )
  }
  return serverCollectionsServiceInstance
}
