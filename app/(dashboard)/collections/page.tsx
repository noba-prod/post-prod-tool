"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar, COLLECTION_STATUSES } from "@/components/custom/filter-bar"
import { Grid } from "@/components/custom/grid"
import { Tables } from "@/components/custom/tables"
import { CollectionsGridSkeleton, TableSkeleton } from "@/components/custom/loading-skeletons"
import { LazyLoadSentinel } from "@/components/custom/lazy-load-sentinel"
import { LAZY_LOAD_PAGE_SIZE, useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Button } from "@/components/ui/button"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import { useUserContext } from "@/lib/contexts/user-context"
import type { CollectionCardProps } from "@/components/custom/collection-card"
import type { Collection as TableCollection } from "@/components/custom/tables"
import { createCollectionsService } from "@/lib/services"
import {
  deriveStageStatusFromShootingStart,
  VIEW_STEP_IDS,
  COLLECTION_TYPE_FILTER_OPTIONS,
  deriveActiveStepHealth,
  type CollectionShootingType,
  type CollectionStatus,
} from "@/lib/domain/collections"
import type { Collection, ListCollectionsPageOptions } from "@/lib/domain/collections"

type FilterCatalogRow = {
  clientId: string | null
  status: string
  reference: string | null
  photographerId: string | null
  shootingType: CollectionShootingType
}

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

async function fetchFilterCatalog(): Promise<{
  rows: FilterCatalogRow[]
  clientNamesById: Record<string, string>
  photographerNamesById: Record<string, string>
}> {
  const response = await fetch("/api/collections/filter-catalog", { cache: "no-store" })
  if (!response.ok) {
    console.error("[CollectionsPage] Failed to fetch filter catalog")
    return { rows: [], clientNamesById: {}, photographerNamesById: {} }
  }
  const data = (await response.json()) as {
    rows?: FilterCatalogRow[]
    clientNamesById?: Record<string, string>
    photographerNamesById?: Record<string, string>
  }
  return {
    rows: data.rows ?? [],
    clientNamesById: data.clientNamesById ?? {},
    photographerNamesById: data.photographerNamesById ?? {},
  }
}

async function fetchVisiblePhotographerUserNames(): Promise<Record<string, string>> {
  const response = await fetch("/api/collections/photographer-names", { cache: "no-store" })
  if (!response.ok) {
    console.error("[CollectionsPage] Failed to fetch visible photographer names")
    return {}
  }
  const data = (await response.json()) as { userNamesById?: Record<string, string> }
  return data.userNamesById ?? {}
}

// ============================================================================
// FILTER TYPES
// ============================================================================

interface Filters {
  client: string | null
  status: string | null
  jobReference: string | null
  photographer: string | null
  collectionType: CollectionShootingType | null
  sortOrder: "asc" | "desc"
}

type PhotographerFilterSelection =
  | { kind: "entity"; id: string }
  | { kind: "user"; id: string }
  | { kind: "name"; nameKey: string }

function parsePhotographerFilter(value: string | null): PhotographerFilterSelection | null {
  if (!value) return null
  if (value.startsWith("name:")) {
    const nameKey = value.slice("name:".length).trim()
    return nameKey ? { kind: "name", nameKey } : null
  }
  if (value.startsWith("entity:")) {
    const id = value.slice("entity:".length).trim()
    return id ? { kind: "entity", id } : null
  }
  if (value.startsWith("user:")) {
    const id = value.slice("user:".length).trim()
    return id ? { kind: "user", id } : null
  }
  return { kind: "entity", id: value }
}

function buildListPageOptions(
  filters: Filters,
  offset: number,
  excludeDrafts: boolean
): ListCollectionsPageOptions {
  const options: ListCollectionsPageOptions = {
    limit: LAZY_LOAD_PAGE_SIZE,
    offset,
    sortOrder: filters.sortOrder,
    excludeDrafts,
  }
  if (filters.client) options.clientEntityId = filters.client
  if (filters.jobReference) options.jobReference = filters.jobReference
  if (filters.collectionType) options.collectionType = filters.collectionType
  if (filters.status) {
    options.status = (
      filters.status === "in-progress" ? "in_progress" : filters.status
    ) as CollectionStatus
  }
  const photographerFilter = parsePhotographerFilter(filters.photographer)
  if (photographerFilter?.kind === "entity") {
    options.photographerEntityId = photographerFilter.id
  } else if (photographerFilter?.kind === "user") {
    options.photographerUserId = photographerFilter.id
  }
  return options
}

function catalogRowMatches(
  row: FilterCatalogRow,
  filters: Filters,
  upTo: "client" | "status" | "jobReference" | "collectionType"
): boolean {
  if (filters.client && row.clientId !== filters.client) return false
  if (upTo === "client") return true
  if (filters.status) {
    const domain = filters.status === "in-progress" ? "in_progress" : filters.status
    if (row.status !== domain) return false
  }
  if (upTo === "status") return true
  if (filters.jobReference && row.reference !== filters.jobReference) return false
  if (upTo === "jobReference") return true
  if (filters.collectionType && row.shootingType !== filters.collectionType) return false
  return true
}

// ============================================================================

/**
 * Maps domain status (with underscore) to UI status (with hyphen).
 * Domain: "draft" | "upcoming" | "in_progress" | "completed" | "canceled"
 * UI: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
 */
function mapStatusToUI(
  status: Collection["status"]
): "draft" | "upcoming" | "in-progress" | "completed" | "canceled" {
  if (status === "in_progress") return "in-progress"
  return status
}

/** Maps domain status to filter-bar / UI filter value. */
function domainStatusToFilterValue(s: Collection["status"]): string {
  return s === "in_progress" ? "in-progress" : s
}

/**
 * Location for card: "City, Country".
 * Same source as Shooting setup → Location (OptionPicker City + OptionPicker Country):
 * config.shootingCity and config.shootingCountry.
 * Shown as-is (no transform) so labels like "A Coruña", "United Kingdom" stay correct.
 */
function collectionLocation(c: Collection): string {
  const { config } = c
  if (!config.shootingCity?.trim() && !config.shootingCountry?.trim()) return "—"
  const city = config.shootingCity?.trim() ?? "—"
  const country = config.shootingCountry?.trim() ?? "—"
  return `${city}, ${country}`
}

/** Obtiene el health del paso activo (primer in-progress) o del último paso si completed. */
function getActiveStepHealth(c: Collection): "on-track" | "on-time" | "delayed" | "at-risk" {
  const statuses = c.stepStatuses
  if (!statuses || typeof statuses !== "object") return "on-track"

  // Active (in-progress) step: recompute health live. The value persisted in
  // step_statuses is a snapshot from the last event and goes stale as deadlines
  // pass, so we derive it against the current time (same logic as the detail view).
  const liveHealth = deriveActiveStepHealth(c.config, statuses)
  if (liveHealth) {
    if (liveHealth === "on-time") return "on-time"
    if (liveHealth === "delayed") return "delayed"
    if (liveHealth === "at-risk") return "at-risk"
    return "on-track"
  }

  // Completed: last step's health
  for (let i = VIEW_STEP_IDS.length - 1; i >= 0; i--) {
    const entry = statuses[VIEW_STEP_IDS[i]]
    if (entry?.health) {
      if (entry.health === "on-time") return "on-time"
      if (entry.health === "delayed") return "delayed"
      if (entry.health === "at-risk") return "at-risk"
      return "on-track"
    }
  }
  return "on-track"
}

/** Comienzo de producción = shooting start (solo cuando está completado ese paso); si no, TBD. Final = deadline (modal). */
function collectionDates(c: Collection): { start: string; end: string } {
  const { config } = c
  const shootingStart = config.shootingStartDate ?? config.shootingDate ?? ""
  const deadline = config.clientFinalsDeadline ?? ""
  const format = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  return {
    start: shootingStart ? format(shootingStart) : "TBD",
    end: deadline ? format(deadline) : "—",
  }
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function CollectionsPage() {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const { entity, isNobaProducerUser, isNobaUser } = useUserContext()
  const isClientUser = entity?.type === "client"
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [loadingMoreCollections, setLoadingMoreCollections] = useState(false)
  const [hasMoreCollections, setHasMoreCollections] = useState(false)
  const [gridAnimateFromIndex, setGridAnimateFromIndex] = useState(0)
  const collectionsRef = React.useRef<Collection[]>([])
  const fetchGenerationRef = React.useRef(0)
  const [collections, setCollections] = useState<Collection[]>([])
  const [clientNamesByEntityId, setClientNamesByEntityId] = useState<Record<string, string>>({})
  const [catalogRows, setCatalogRows] = useState<FilterCatalogRow[]>([])
  const [photographerOptions, setPhotographerOptions] = useState<{ id: string; name: string }[]>([])
  const [photographerNamesByUserId, setPhotographerNamesByUserId] = useState<Record<string, string>>({})

  // View state (Gallery or List)
  const [activeView, setActiveView] = useState<string>("Gallery")

  // Filters state
  const [filters, setFilters] = useState<Filters>({
    client: null,
    status: null,
    jobReference: null,
    photographer: null,
    collectionType: null,
    sortOrder: "desc",
  })

  // Auth check
  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await authAdapter.getSession()
      if (!currentSession) {
        router.push("/auth/login")
        return
      }
      setSession(currentSession)
      setLoading(false)
    }
    checkSession()
  }, [router, authAdapter])

  React.useEffect(() => {
    collectionsRef.current = collections
  }, [collections])

  const buildPageOptions = React.useCallback(
    (offset: number) => buildListPageOptions(filters, offset, !isNobaUser),
    [filters, isNobaUser]
  )

  const fetchCollectionsPage = React.useCallback(
    async (mode: "reset" | "append") => {
      if (!session) return
      const isReset = mode === "reset"
      const generation = isReset
        ? ++fetchGenerationRef.current
        : fetchGenerationRef.current
      if (isReset) {
        setLoadingCollections(true)
      } else {
        setLoadingMoreCollections(true)
      }

      const offset = isReset ? 0 : collectionsRef.current.length

      try {
        const service = createCollectionsService()
        const { items, hasMore } = await service.listCollectionsPage(buildPageOptions(offset))
        if (generation !== fetchGenerationRef.current) return

        if (isReset) {
          setCollections(items)
          setGridAnimateFromIndex(0)
        } else {
          setGridAnimateFromIndex(collectionsRef.current.length)
          setCollections((prev) => {
            const existingIds = new Set(prev.map((c) => c.id))
            const newItems = items.filter((item) => !existingIds.has(item.id))
            return [...prev, ...newItems]
          })
        }
        setHasMoreCollections(hasMore)
      } finally {
        if (generation === fetchGenerationRef.current) {
          setLoadingCollections(false)
          setLoadingMoreCollections(false)
        }
      }
    },
    [session, buildPageOptions]
  )

  // Fetch first page when session or filters change
  useEffect(() => {
    if (!session) return
    void fetchCollectionsPage("reset")
  }, [session, filters, fetchCollectionsPage])

  const loadMoreCollections = React.useCallback(() => {
    if (loadingCollections || loadingMoreCollections || !hasMoreCollections) return
    void fetchCollectionsPage("append")
  }, [
    loadingCollections,
    loadingMoreCollections,
    hasMoreCollections,
    fetchCollectionsPage,
  ])

  const infiniteScrollRef = useInfiniteScroll({
    onLoadMore: loadMoreCollections,
    hasMore: hasMoreCollections,
    isLoading: loadingCollections || loadingMoreCollections,
  })

  useEffect(() => {
    if (!session) return
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setCatalogRows([])
        setClientNamesByEntityId({})
        setPhotographerOptions([])
        setPhotographerNamesByUserId({})
        return
      }
      const [catalog, userNamesById] = await Promise.all([
        fetchFilterCatalog(),
        fetchVisiblePhotographerUserNames(),
      ])
      setCatalogRows(catalog.rows)
      setClientNamesByEntityId(catalog.clientNamesById)
      setPhotographerOptions(
        Object.entries(catalog.photographerNamesById)
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      )
      setPhotographerNamesByUserId(userNamesById)
    }
    void load()
  }, [session])

  const collectionStatusOptionsForBar = React.useMemo(() => {
    const seen = new Set<string>()
    for (const row of catalogRows) {
      if (!catalogRowMatches(row, filters, "client")) continue
      seen.add(domainStatusToFilterValue(row.status as Collection["status"]))
    }
    return COLLECTION_STATUSES.filter((s) => seen.has(s.value))
  }, [catalogRows, filters])

  const jobReferenceOptionsForBar = React.useMemo(() => {
    const refs = new Set<string>()
    for (const row of catalogRows) {
      if (!catalogRowMatches(row, filters, "status")) continue
      if (row.reference) refs.add(row.reference)
    }
    return Array.from(refs).sort().map((value) => ({ value }))
  }, [catalogRows, filters])

  const collectionTypeOptionsForBar = React.useMemo(() => {
    const seen = new Set<CollectionShootingType>()
    for (const row of catalogRows) {
      if (!catalogRowMatches(row, filters, "jobReference")) continue
      seen.add(row.shootingType)
    }
    return COLLECTION_TYPE_FILTER_OPTIONS.filter((option) => seen.has(option.value))
  }, [catalogRows, filters])

  const photographerOptionsForBar = React.useMemo(() => {
    const namesById = new Map(photographerOptions.map((p) => [p.id, p.name]))
    const options: { id: string; name: string }[] = []
    const seen = new Set<string>()
    for (const row of catalogRows) {
      if (!catalogRowMatches(row, filters, "collectionType")) continue
      const id = row.photographerId
      if (!id || seen.has(id)) continue
      const name = namesById.get(id)
      if (!name) continue
      seen.add(id)
      options.push({ id, name })
    }
    return options.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
  }, [catalogRows, filters, photographerOptions])

  const clientOptionsForBar = React.useMemo(() => {
    const seen = new Set<string>()
    const options: { id: string; name: string }[] = []
    for (const row of catalogRows) {
      const id = row.clientId
      if (!id || seen.has(id)) continue
      const name = clientNamesByEntityId[id]
      if (!name) continue
      seen.add(id)
      options.push({ id, name })
    }
    return options.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    )
  }, [catalogRows, clientNamesByEntityId])

  // Handle filter changes (cascade: client → status → job reference → photographer)
  const handleFilterChange = React.useCallback((filterId: string, value: string) => {
    const v = value === "" ? null : value
    setFilters((prev) => {
      if (filterId === "client") {
        return {
          ...prev,
          client: v,
          status: null,
          jobReference: null,
          photographer: null,
          collectionType: null,
        }
      }
      if (filterId === "status") {
        return {
          ...prev,
          status: v,
          jobReference: null,
          photographer: null,
          collectionType: null,
        }
      }
      if (filterId === "jobReference") {
        return { ...prev, jobReference: v, photographer: null, collectionType: null }
      }
      if (filterId === "photographer") {
        return { ...prev, photographer: v }
      }
      if (filterId === "collectionType") {
        return { ...prev, collectionType: v as CollectionShootingType | null }
      }
      return prev
    })
  }, [])

  // Handle sort changes
  const handleSortChange = (order: "asc" | "desc") => {
    setFilters(prev => ({ ...prev, sortOrder: order }))
  }

  const filteredCollections = React.useMemo(() => {
    const result = [...collections]
    result.sort((a, b) => {
      const tA = new Date(a.updatedAt).getTime()
      const tB = new Date(b.updatedAt).getTime()
      return filters.sortOrder === "desc" ? tB - tA : tA - tB
    })
    return result
  }, [collections, filters.sortOrder])

  /** Navigate to collection: draft → setup flow, published → view flow */
  const handleCollectionClick = React.useCallback(
    (id: string, status: Collection["status"]) => {
      if (status === "draft") {
        router.push(`/collections/create/${id}`)
      } else {
        router.push(`/collections/${id}`)
      }
    },
    [router]
  )

  const gridItems: CollectionCardProps[] = React.useMemo(() => {
    return filteredCollections.map((c) => {
      const { start, end } = collectionDates(c)
      const clientName = clientNamesByEntityId[c.config.clientEntityId]
        ? `@${clientNamesByEntityId[c.config.clientEntityId].toLowerCase()}`
        : "—"
      const photographerParticipant = c.participants.find((p) => p.role === "photographer")
      const photographerEntityId = photographerParticipant?.entityId
      const photographerUserId = photographerParticipant?.userIds?.[0]
      const photographerName =
        photographerEntityId
          ? photographerOptions.find((p) => p.id === photographerEntityId)?.name ?? undefined
          : photographerUserId
            ? photographerNamesByUserId[photographerUserId]
            : undefined
      const baseUI = mapStatusToUI(c.status)
      const displayStatus =
        c.status === "in_progress"
          ? "in-progress"
          : c.status === "upcoming"
            ? deriveStageStatusFromShootingStart(
                {
                  shootingStartDate: c.config.shootingStartDate ?? c.config.shootingDate,
                  shootingStartTime: c.config.shootingStartTime,
                },
                "upcoming"
              )
            : baseUI
      const showProgressTag = displayStatus === "in-progress"
      return {
        id: c.id,
        status: displayStatus,
        collectionName: c.config.name || "—",
        clientName,
        photographerName,
        location: collectionLocation(c),
        startDate: start,
        endDate: end,
        ...(showProgressTag && {
          progress: c.completionPercentage ?? 0,
          stepHealthStatus: getActiveStepHealth(c),
        }),
        onClick: () => handleCollectionClick(c.id, c.status),
      }
    })
  }, [filteredCollections, clientNamesByEntityId, photographerOptions, photographerNamesByUserId, handleCollectionClick])

  const tableItems: TableCollection[] = React.useMemo(() => {
    return filteredCollections.map((c) => {
      const { start } = collectionDates(c)
      const loc = collectionLocation(c)
      const clientName = clientNamesByEntityId[c.config.clientEntityId]
      const client = clientName
        ? clientName.charAt(0).toUpperCase() + clientName.slice(1)
        : "—"
      const baseUI = mapStatusToUI(c.status)
      const displayStatus =
        c.status === "in_progress"
          ? "in-progress"
          : c.status === "upcoming"
            ? deriveStageStatusFromShootingStart(
                {
                  shootingStartDate: c.config.shootingStartDate ?? c.config.shootingDate,
                  shootingStartTime: c.config.shootingStartTime,
                },
                "upcoming"
              )
            : baseUI
      return {
        id: c.id,
        name: c.config.name || "—",
        status: displayStatus,
        client,
        jobReference: c.config.reference?.trim() || "—",
        starting: start,
        location:
          loc !== "—"
            ? loc.split(", ").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")
            : "—",
        participants: c.participants.length,
      }
    })
  }, [filteredCollections, clientNamesByEntityId])

  const hasItems = filteredCollections.length > 0
  const hasActiveFilters = Boolean(
    filters.client ||
      filters.status ||
      filters.jobReference ||
      filters.photographer ||
      filters.collectionType
  )
  const isEmpty = collections.length === 0 && !hasActiveFilters
  const showInitialSkeleton = loadingCollections && collections.length === 0

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <MainTemplate
      title="Collections"
      navBarProps={{
        variant: "noba",
        userName: "Martin Becerra",
        organization: "noba",
        role: "admin",
        isAdmin: true,
      }}
    >
      <Layout padding="none" showSeparators={false}>
        <LayoutSection>
          <FilterBar
            variant="collections"
            activeView={activeView}
            onViewChange={setActiveView}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            showAction={false}
            collectionFilterState={filters}
            collectionStatusOptions={collectionStatusOptionsForBar}
            collectionTypeOptions={collectionTypeOptionsForBar}
            hideClientFilter={isClientUser}
            clientOptions={clientOptionsForBar}
            photographerOptions={photographerOptionsForBar}
            jobReferenceOptions={jobReferenceOptionsForBar}
          />
        </LayoutSection>
        <LayoutSection>
          {showInitialSkeleton ? (
            activeView === "Gallery" ? (
              <CollectionsGridSkeleton />
            ) : (
              <TableSkeleton variant="collections" />
            )
          ) : (
            <div className={loadingCollections ? "pointer-events-none opacity-60" : undefined}>
              {activeView === "Gallery" ? (
                <>
                  <Grid
                    items={gridItems}
                    animateFromIndex={gridAnimateFromIndex}
                  />
                  <LazyLoadSentinel
                    sentinelRef={infiniteScrollRef}
                    isLoading={loadingMoreCollections}
                    hasMore={hasMoreCollections}
                  />
                </>
              ) : (
                <>
                  <Tables
                    variant="collections"
                    collectionsData={tableItems}
                    animateRowsFromIndex={gridAnimateFromIndex}
                    onCollectionRowClick={(id, status) => {
                      const isDraft = status === "draft"
                      if (isDraft) router.push(`/collections/create/${id}`)
                      else router.push(`/collections/${id}`)
                    }}
                    onSettings={(id) => console.log("Settings for collection:", id)}
                  />
                  <LazyLoadSentinel
                    sentinelRef={infiniteScrollRef}
                    isLoading={loadingMoreCollections}
                    hasMore={hasMoreCollections}
                  />
                </>
              )}
              {!hasItems && !loadingCollections && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  {isEmpty ? (
                    <>
                      <p className="text-lg font-medium text-muted-foreground">
                        No collections yet
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isNobaProducerUser
                          ? "Create your first collection to get started."
                          : "Only noba producer users can create collections."}
                      </p>
                      {isNobaProducerUser && (
                        <Button
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(new CustomEvent("noba:open-create-collection"))
                            }
                          }}
                        >
                          Create new
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-muted-foreground">
                        No collections found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your filters
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </LayoutSection>
      </Layout>
    </MainTemplate>
  )
}
