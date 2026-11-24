/**
 * Collections list filter URL state. Run with: npm run test:list-filters
 */

import {
  applyCollectionListFilterChange,
  DEFAULT_COLLECTION_LIST_FILTERS,
  parseCollectionListSearchParams,
  serializeCollectionListState,
} from "../list-filters"

function assert(label: string, condition: boolean, detail?: string): void {
  if (!condition) throw new Error(detail ? `${label}: ${detail}` : label)
}

function params(query: string): { get(name: string): string | null } {
  const search = new URLSearchParams(query)
  return { get: (name) => search.get(name) }
}

function run(): void {
  const parsed = parseCollectionListSearchParams(
    params("client=c1&status=in-progress&ref=JOB-1&photographer=entity:p1&type=digital&sort=asc&view=list")
  )
  assert("client", parsed.filters.client === "c1")
  assert("status", parsed.filters.status === "in-progress")
  assert("ref", parsed.filters.jobReference === "JOB-1")
  assert("photographer", parsed.filters.photographer === "entity:p1")
  assert("type", parsed.filters.collectionType === "digital")
  assert("sort", parsed.filters.sortOrder === "asc")
  assert("view", parsed.view === "List")

  const invalid = parseCollectionListSearchParams(
    params("status=nope&type=film&sort=sideways&view=mosaic")
  )
  assert("invalid status dropped", invalid.filters.status === null)
  assert("invalid type dropped", invalid.filters.collectionType === null)
  assert("invalid sort defaults", invalid.filters.sortOrder === "desc")
  assert("invalid view defaults", invalid.view === "Gallery")

  const query = serializeCollectionListState(parsed)
  const roundTrip = parseCollectionListSearchParams(params(query))
  assert("round trip", JSON.stringify(roundTrip) === JSON.stringify(parsed), JSON.stringify(roundTrip))

  const defaults = serializeCollectionListState({
    filters: DEFAULT_COLLECTION_LIST_FILTERS,
    view: "Gallery",
  })
  assert("defaults omitted", defaults === "", JSON.stringify(defaults))

  const cascaded = applyCollectionListFilterChange(
    { ...DEFAULT_COLLECTION_LIST_FILTERS, status: "completed", jobReference: "JOB-1", photographer: "p", collectionType: "digital" },
    "client",
    "c2"
  )
  assert("cascade client", cascaded.client === "c2" && cascaded.status === null && cascaded.jobReference === null && cascaded.photographer === null && cascaded.collectionType === null)

  const cleared = applyCollectionListFilterChange(
    { ...DEFAULT_COLLECTION_LIST_FILTERS, status: "draft" },
    "status",
    ""
  )
  assert("explicit clear", cleared.status === null)

  const clearedAll = applyCollectionListFilterChange(
    {
      client: "c1",
      status: "completed",
      jobReference: "JOB-1",
      photographer: "p1",
      collectionType: "digital",
      sortOrder: "asc",
    },
    "clearAll",
    ""
  )
  assert(
    "clearAll resets filters",
    clearedAll.client === null &&
      clearedAll.status === null &&
      clearedAll.jobReference === null &&
      clearedAll.photographer === null &&
      clearedAll.collectionType === null &&
      clearedAll.sortOrder === "desc",
    JSON.stringify(clearedAll)
  )

  console.log("list filter checks passed")
}

run()
