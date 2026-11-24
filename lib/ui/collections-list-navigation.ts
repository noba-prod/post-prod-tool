/**
 * Browser-side memory for the Collections list so internal "back to Collections" links
 * (nav bar, breadcrumbs, redirects) land on the same filtered list, and the scroll position
 * is restored after returning from a collection. Session-scoped (per tab).
 */

const LAST_QUERY_KEY = "noba:collections:lastQuery"
const SCROLL_SNAPSHOT_KEY = "noba:collections:scroll"

export const COLLECTIONS_LIST_PATH = "/collections"

export interface CollectionsListScrollSnapshot {
  query: string
  scrollY: number
  loadedCount: number
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function rememberCollectionsListQuery(query: string): void {
  const s = storage()
  if (!s) return
  try {
    if (query) s.setItem(LAST_QUERY_KEY, query)
    else s.removeItem(LAST_QUERY_KEY)
  } catch {
    // Storage full or disabled: links fall back to the unfiltered list.
  }
}

/** `/collections` plus the last filters the user applied in this tab, if any. */
export function getCollectionsListHref(): string {
  const query = storage()?.getItem(LAST_QUERY_KEY) ?? ""
  return query ? `${COLLECTIONS_LIST_PATH}?${query}` : COLLECTIONS_LIST_PATH
}

export function saveCollectionsListScroll(snapshot: CollectionsListScrollSnapshot): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(SCROLL_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // Best-effort only.
  }
}

/** Returns the snapshot only when it belongs to the same list query, and clears it. */
export function consumeCollectionsListScroll(query: string): CollectionsListScrollSnapshot | null {
  const s = storage()
  if (!s) return null
  const raw = s.getItem(SCROLL_SNAPSHOT_KEY)
  if (!raw) return null
  s.removeItem(SCROLL_SNAPSHOT_KEY)
  try {
    const parsed = JSON.parse(raw) as Partial<CollectionsListScrollSnapshot>
    if (
      parsed.query !== query ||
      typeof parsed.scrollY !== "number" ||
      typeof parsed.loadedCount !== "number"
    ) {
      return null
    }
    return { query, scrollY: parsed.scrollY, loadedCount: parsed.loadedCount }
  } catch {
    return null
  }
}
