"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar, COLLECTION_STATUSES } from "@/components/custom/filter-bar"
import { Grid } from "@/components/custom/grid"
import { Tables } from "@/components/custom/tables"
import { Button } from "@/components/ui/button"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import { useUserContext } from "@/lib/contexts/user-context"
import { CollectionCard, type CollectionCardProps } from "@/components/custom/collection-card"
import type { Collection as TableCollection } from "@/components/custom/tables"
import { createCollectionsService } from "@/lib/services"
import { createClient } from "@/lib/supabase/client"
import {
  deriveStageStatusFromShootingStart,
  VIEW_STEP_IDS,
} from "@/lib/domain/collections"
import type { Collection } from "@/lib/domain/collections"
import type { Organization } from "@/lib/supabase/database.types"

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

async function fetchVisibleClientNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const response = await fetch(
    `/api/collections/client-names?ids=${encodeURIComponent(ids.join(","))}`,
    { cache: "no-store" }
  )
  if (!response.ok) {
    console.error("[CollectionsPage] Failed to fetch visible client names")
    return {}
  }
  const data = (await response.json()) as { namesById?: Record<string, string> }
  return data.namesById ?? {}
}

async function fetchClientsFromSupabase(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, name")
    .eq("type", "client")
    .order("name")
  if (error) {
    console.error("[CollectionsPage] Failed to fetch clients:", error)
    return []
  }
  return (data ?? []).map((org: Pick<Organization, "id" | "name">) => ({ id: org.id, name: org.name }))
}

async function fetchPhotographersFromSupabase(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, name")
    .in("type", ["photography_agency", "self_photographer"])
    .order("name")
  if (error) {
    console.error("[CollectionsPage] Failed to fetch photographers:", error)
    return []
  }
  return (data ?? []).map((org: Pick<Organization, "id" | "name">) => ({ id: org.id, name: org.name }))
}

// ============================================================================
// FILTER TYPES
// ============================================================================

interface Filters {
  client: string | null
  status: string | null
  jobReference: string | null
  photographer: string | null
  sortOrder: "asc" | "desc"
}

// ============================================================================
// DRAFT → CARD HELPERS
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

  for (const stepId of VIEW_STEP_IDS) {
    const entry = statuses[stepId]
    if (!entry) continue
    const stage = entry.stage
    const health = entry.health
    if (stage === "in-progress" && health) {
      if (health === "on-time") return "on-time"
      if (health === "delayed") return "delayed"
      if (health === "at-risk") return "at-risk"
      return "on-track"
    }
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
  const pathname = usePathname()
  const authAdapter = useAuthAdapter()
  const { isNobaProducerUser, isNobaUser } = useUserContext()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [collections, setCollections] = useState<Collection[]>([])
  const [clientNamesByEntityId, setClientNamesByEntityId] = useState<Record<string, string>>({})
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([])
  const [photographerOptions, setPhotographerOptions] = useState<{ id: string; name: string }[]>([])

  // View state (Gallery or List)
  const [activeView, setActiveView] = useState<string>("Gallery")

  // Filters state
  const [filters, setFilters] = useState<Filters>({
    client: null,
    status: null,
    jobReference: null,
    photographer: null,
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

  // Fetch collections from service (single source of truth for list)
  const refetchCollections = React.useCallback(() => {
    if (!session) return
    const service = createCollectionsService()
    service.listCollections().then(setCollections)
  }, [session])

  useEffect(() => {
    if (!session) return
    refetchCollections()
  }, [session, refetchCollections])

  // Refetch when navigating to this page so list and card status stay in sync with shooting dates
  useEffect(() => {
    if (pathname === "/collections" && session) refetchCollections()
  }, [pathname, session, refetchCollections])

  // Refetch list when window/tab gains focus or becomes visible so that after editing shooting dates we show updated status
  useEffect(() => {
    const refetch = () => refetchCollections()
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch()
    }
    window.addEventListener("focus", refetch)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", refetch)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refetchCollections])

  // Load client and photographer options for filters (registered entities)
  useEffect(() => {
    if (!session) return
    const load = async () => {
      if (isSupabaseConfigured()) {
        const clients = await fetchClientsFromSupabase()
        const photographers = await fetchPhotographersFromSupabase()
        setClientOptions(clients)
        setPhotographerOptions(photographers)
      } else {
        setClientOptions([])
        setPhotographerOptions([])
      }
    }
    load()
  }, [session])

  // Resolve client display names for collections (works for all roles via server-side endpoint)
  useEffect(() => {
    if (collections.length === 0) {
      setClientNamesByEntityId({})
      return
    }
    const ids = [...new Set(collections.map((c) => c.config.clientEntityId).filter(Boolean))]
    if (ids.length === 0) {
      setClientNamesByEntityId({})
      return
    }
    const load = async () => {
      if (isSupabaseConfigured()) {
        const map = await fetchVisibleClientNames(ids)
        setClientNamesByEntityId(map)
      } else {
        setClientNamesByEntityId({})
      }
    }
    load()
  }, [collections])

  const collectionsBase = React.useMemo(() => {
    if (!isNobaUser) {
      return collections.filter((c) => c.status !== "draft")
    }
    return collections
  }, [collections, isNobaUser])

  const scopeAfterClient = React.useMemo(() => {
    if (!filters.client) return collectionsBase
    return collectionsBase.filter((c) => c.config.clientEntityId === filters.client)
  }, [collectionsBase, filters.client])

  const collectionStatusOptionsForBar = React.useMemo(() => {
    const seen = new Set<string>()
    for (const c of scopeAfterClient) {
      seen.add(domainStatusToFilterValue(c.status))
    }
    return COLLECTION_STATUSES.filter((s) => seen.has(s.value))
  }, [scopeAfterClient])

  const scopeAfterStatus = React.useMemo(() => {
    let result = scopeAfterClient
    if (filters.status) {
      const domain =
        filters.status === "in-progress" ? "in_progress" : filters.status
      result = result.filter((c) => c.status === domain)
    }
    return result
  }, [scopeAfterClient, filters.status])

  const jobReferenceOptionsForBar = React.useMemo(() => {
    const refs = new Set<string>()
    for (const c of scopeAfterStatus) {
      const r = c.config.reference?.trim()
      if (r) refs.add(r)
    }
    return Array.from(refs).sort().map((value) => ({ value }))
  }, [scopeAfterStatus])

  const scopeAfterJobRef = React.useMemo(() => {
    let result = scopeAfterStatus
    if (filters.jobReference) {
      result = result.filter(
        (c) => (c.config.reference?.trim() ?? "") === filters.jobReference
      )
    }
    return result
  }, [scopeAfterStatus, filters.jobReference])

  const photographerOptionsForBar = React.useMemo(() => {
    const idSet = new Set<string>()
    for (const c of scopeAfterJobRef) {
      for (const p of c.participants) {
        if (p.role === "photographer" && p.entityId) idSet.add(p.entityId)
      }
    }
    return photographerOptions.filter((p) => idSet.has(p.id))
  }, [photographerOptions, scopeAfterJobRef])

  const clientOptionsForBar = React.useMemo(() => {
    const ids = new Set(
      collectionsBase
        .map((c) => c.config.clientEntityId)
        .filter((id): id is string => Boolean(id))
    )
    return clientOptions.filter((c) => ids.has(c.id))
  }, [clientOptions, collectionsBase])

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
        }
      }
      if (filterId === "status") {
        return {
          ...prev,
          status: v,
          jobReference: null,
          photographer: null,
        }
      }
      if (filterId === "jobReference") {
        return { ...prev, jobReference: v, photographer: null }
      }
      if (filterId === "photographer") {
        return { ...prev, photographer: v }
      }
      return prev
    })
  }, [])

  // Handle sort changes
  const handleSortChange = (order: "asc" | "desc") => {
    setFilters(prev => ({ ...prev, sortOrder: order }))
  }

  // Handle logout
  const handleLogout = async () => {
    await authAdapter.logout()
    router.push("/auth/login")
  }

  const filteredCollections = React.useMemo(() => {
    let result = [...collections]
    // Non-Noba users (client, photo_lab, handprint_lab, photographer, agency, retouch_studio) never see draft collections
    if (!isNobaUser) {
      result = result.filter((c) => c.status !== "draft")
    }
    if (filters.client) {
      result = result.filter((c) => c.config.clientEntityId === filters.client)
    }
    if (filters.status) {
      const domainStatus = filters.status === "in-progress" ? "in_progress" : filters.status
      result = result.filter((c) => c.status === domainStatus)
    }
    if (filters.photographer) {
      result = result.filter((c) =>
        c.participants.some(
          (p) => p.role === "photographer" && p.entityId === filters.photographer
        )
      )
    }
    if (filters.jobReference) {
      result = result.filter(
        (c) => (c.config.reference?.trim() ?? "") === filters.jobReference
      )
    }
    result.sort((a, b) => {
      const tA = new Date(a.updatedAt).getTime()
      const tB = new Date(b.updatedAt).getTime()
      return filters.sortOrder === "desc" ? tB - tA : tA - tB
    })
    return result
  }, [collections, isNobaUser, filters.client, filters.status, filters.photographer, filters.jobReference, filters.sortOrder])

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
  }, [filteredCollections, clientNamesByEntityId, handleCollectionClick])

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
  const isEmpty = collections.length === 0

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
            clientOptions={clientOptionsForBar}
            photographerOptions={photographerOptionsForBar}
            jobReferenceOptions={jobReferenceOptionsForBar}
          />
        </LayoutSection>
        <LayoutSection>
          {activeView === "Gallery" ? (
            <Grid items={gridItems} />
          ) : (
            <Tables
              variant="collections"
              collectionsData={tableItems}
              onCollectionRowClick={(id, status) => {
                // UI status: draft | upcoming | in-progress | completed | canceled
                const isDraft = status === "draft"
                if (isDraft) router.push(`/collections/create/${id}`)
                else router.push(`/collections/${id}`)
              }}
              onSettings={(id) => console.log("Settings for collection:", id)}
            />
          )}
          {!hasItems && (
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
        </LayoutSection>
      </Layout>
    </MainTemplate>
  )
}
