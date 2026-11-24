/**
 * Collections list state (filters, sort, view) <-> URL search params.
 * The URL is the source of truth so browser back/forward and shared links restore the same list.
 * Pure: no React, no browser APIs.
 */

import type { CollectionShootingType } from "./collection-shooting-type"
import { COLLECTION_TYPE_FILTER_OPTIONS } from "./collection-shooting-type"

export type CollectionListSortOrder = "asc" | "desc"
export type CollectionListView = "Gallery" | "List"

export interface CollectionListFilters {
  client: string | null
  status: string | null
  jobReference: string | null
  photographer: string | null
  collectionType: CollectionShootingType | null
  sortOrder: CollectionListSortOrder
}

export interface CollectionListState {
  filters: CollectionListFilters
  view: CollectionListView
}

/** Status values used by the Collections filter bar (UI hyphenated form). */
export const COLLECTION_LIST_STATUS_VALUES = [
  "draft",
  "in-progress",
  "upcoming",
  "completed",
  "canceled",
] as const

export const DEFAULT_COLLECTION_LIST_FILTERS: CollectionListFilters = {
  client: null,
  status: null,
  jobReference: null,
  photographer: null,
  collectionType: null,
  sortOrder: "desc",
}

export const DEFAULT_COLLECTION_LIST_VIEW: CollectionListView = "Gallery"

/** Query param names. Short and stable: they end up in shared URLs. */
export const COLLECTION_LIST_PARAMS = {
  client: "client",
  status: "status",
  jobReference: "ref",
  photographer: "photographer",
  collectionType: "type",
  sortOrder: "sort",
  view: "view",
} as const

const MAX_PARAM_LENGTH = 200

type SearchParamsLike = { get(name: string): string | null }

function readText(params: SearchParamsLike, key: string): string | null {
  const raw = params.get(key)
  if (raw == null) return null
  const value = raw.trim()
  if (!value || value.length > MAX_PARAM_LENGTH) return null
  return value
}

export function parseCollectionListSearchParams(params: SearchParamsLike): CollectionListState {
  const status = readText(params, COLLECTION_LIST_PARAMS.status)
  const type = readText(params, COLLECTION_LIST_PARAMS.collectionType)
  const sort = readText(params, COLLECTION_LIST_PARAMS.sortOrder)
  const view = readText(params, COLLECTION_LIST_PARAMS.view)

  return {
    filters: {
      client: readText(params, COLLECTION_LIST_PARAMS.client),
      status:
        status && (COLLECTION_LIST_STATUS_VALUES as readonly string[]).includes(status)
          ? status
          : null,
      jobReference: readText(params, COLLECTION_LIST_PARAMS.jobReference),
      photographer: readText(params, COLLECTION_LIST_PARAMS.photographer),
      collectionType: COLLECTION_TYPE_FILTER_OPTIONS.some((o) => o.value === type)
        ? (type as CollectionShootingType)
        : null,
      sortOrder: sort === "asc" ? "asc" : "desc",
    },
    view: view?.toLowerCase() === "list" ? "List" : DEFAULT_COLLECTION_LIST_VIEW,
  }
}

/** Serializes to a query string without the leading "?". Defaults are omitted. */
export function serializeCollectionListState(state: CollectionListState): string {
  const params = new URLSearchParams()
  const { filters, view } = state
  if (filters.client) params.set(COLLECTION_LIST_PARAMS.client, filters.client)
  if (filters.status) params.set(COLLECTION_LIST_PARAMS.status, filters.status)
  if (filters.jobReference) params.set(COLLECTION_LIST_PARAMS.jobReference, filters.jobReference)
  if (filters.photographer) params.set(COLLECTION_LIST_PARAMS.photographer, filters.photographer)
  if (filters.collectionType) params.set(COLLECTION_LIST_PARAMS.collectionType, filters.collectionType)
  if (filters.sortOrder !== DEFAULT_COLLECTION_LIST_FILTERS.sortOrder) {
    params.set(COLLECTION_LIST_PARAMS.sortOrder, filters.sortOrder)
  }
  if (view !== DEFAULT_COLLECTION_LIST_VIEW) params.set(COLLECTION_LIST_PARAMS.view, "list")
  return params.toString()
}

/**
 * Applies a filter change with the list's cascade rules:
 * client → resets status, job reference, photographer, type;
 * status → resets job reference, photographer, type;
 * job reference → resets photographer, type.
 */
export function applyCollectionListFilterChange(
  prev: CollectionListFilters,
  filterId: string,
  value: string
): CollectionListFilters {
  const v = value === "" ? null : value
  switch (filterId) {
    case "clearAll":
      // Full reset in one shot. Callers must not follow with onSortChange(prev),
      // or a stale filters snapshot will re-apply the cleared values.
      return { ...DEFAULT_COLLECTION_LIST_FILTERS }
    case "client":
      return { ...prev, client: v, status: null, jobReference: null, photographer: null, collectionType: null }
    case "status":
      return { ...prev, status: v, jobReference: null, photographer: null, collectionType: null }
    case "jobReference":
      return { ...prev, jobReference: v, photographer: null, collectionType: null }
    case "photographer":
      return { ...prev, photographer: v }
    case "collectionType":
      return { ...prev, collectionType: v as CollectionShootingType | null }
    default:
      return prev
  }
}
