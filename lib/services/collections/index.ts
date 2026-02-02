export { CollectionsService, CollectionsServiceError } from "./collections.service"

import type { ICollectionsRepository } from "@/lib/domain/collections"
import { createClient } from "@/lib/supabase/client"
import { InMemoryCollectionsRepository } from "@/lib/infra/collections/in-memory-collections.repository"
import { LocalStorageCollectionsRepository } from "@/lib/infra/collections/localstorage-collections.repository"
import { SupabaseCollectionsRepository } from "@/lib/infra/collections/supabase-collections.repository"
import { CollectionsService } from "./collections.service"
import { NoopNotificationsService } from "../notifications/noop-notifications.service"
import { NotificationsService } from "../notifications/notifications.service"

/**
 * True when Supabase URL and anon key are set for collections.
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

/**
 * Returns the collections repository for the current runtime.
 * When Supabase is configured, uses Supabase; otherwise SSR uses in-memory, browser uses localStorage.
 */
export function getCollectionsRepository(): ICollectionsRepository {
  if (typeof window === "undefined") {
    return new InMemoryCollectionsRepository()
  }
  if (isSupabaseConfigured()) {
    return new SupabaseCollectionsRepository()
  }
  return new LocalStorageCollectionsRepository()
}

/**
 * Returns the notifications service for the current runtime.
 * In the browser with Supabase configured, uses the real NotificationsService so that
 * publish triggers scheduleTimeBasedNotifications and scheduled_notification_tracking is populated.
 * On the server or without Supabase, uses NoopNotificationsService.
 */
function getNotificationsService(): NoopNotificationsService | NotificationsService {
  if (typeof window === "undefined") {
    return new NoopNotificationsService()
  }
  if (isSupabaseConfigured()) {
    return new NotificationsService(createClient())
  }
  return new NoopNotificationsService()
}

let collectionsServiceInstance: CollectionsService | null = null

/**
 * Factory that returns a CollectionsService wired to the appropriate repository
 * (localStorage in browser, in-memory on server) and notifications service.
 */
export function createCollectionsService(): CollectionsService {
  if (!collectionsServiceInstance) {
    collectionsServiceInstance = new CollectionsService(
      getCollectionsRepository(),
      getNotificationsService()
    )
  }
  return collectionsServiceInstance
}
