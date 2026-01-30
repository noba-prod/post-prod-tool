export { CollectionsService, CollectionsServiceError } from "./collections.service"

import type { ICollectionsRepository } from "@/lib/domain/collections"
import { InMemoryCollectionsRepository } from "@/lib/infra/collections/in-memory-collections.repository"
import { LocalStorageCollectionsRepository } from "@/lib/infra/collections/localstorage-collections.repository"
import { SupabaseCollectionsRepository } from "@/lib/infra/collections/supabase-collections.repository"
import { CollectionsService } from "./collections.service"
import { NoopNotificationsService } from "../notifications/noop-notifications.service"

/**
 * True when Supabase should be used for collections (mock auth off + URL and anon key set).
 */
function isSupabaseConfigured(): boolean {
  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"
  if (useMockAuth) return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

/**
 * Returns the collections repository for the current runtime.
 * When NEXT_PUBLIC_USE_MOCK_AUTH=false and Supabase is configured, uses Supabase.
 * Otherwise: SSR uses in-memory; browser uses localStorage (mock data).
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

let collectionsServiceInstance: CollectionsService | null = null

/**
 * Factory that returns a CollectionsService wired to the appropriate repository
 * (localStorage in browser, in-memory on server).
 */
export function createCollectionsService(): CollectionsService {
  if (!collectionsServiceInstance) {
    collectionsServiceInstance = new CollectionsService(
      getCollectionsRepository(),
      new NoopNotificationsService()
    )
  }
  return collectionsServiceInstance
}
