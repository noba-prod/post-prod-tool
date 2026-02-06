"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
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
import { deriveStageStatusFromShootingStart } from "@/lib/domain/collections"
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

async function fetchOrganizationNamesFromSupabase(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("organizations") as any)
    .select("id, name")
    .in("id", ids)
  if (error) {
    console.error("[CollectionsPage] Failed to fetch organization names:", error)
    return {}
  }
  const orgs = (data ?? []) as Pick<Organization, "id" | "name">[]
  const map: Record<string, string> = {}
  for (const org of orgs) {
    map[org.id] = org.name
  }
  return map
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
  createdBy: string | null
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
  const { isNobaProducerUser } = useUserContext()
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
    createdBy: null,
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

  // Resolve client display names for collections (entity by clientEntityId)
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
        const map = await fetchOrganizationNamesFromSupabase(ids)
        setClientNamesByEntityId(map)
      } else {
        setClientNamesByEntityId({})
      }
    }
    load()
  }, [collections])

  // Handle filter changes
  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: prev[filterId as keyof Filters] === value ? null : value,
    }))
  }

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
    if (filters.createdBy) {
      result = result.filter((c) => c.config.managerUserId === filters.createdBy)
    }
    result.sort((a, b) => {
      const tA = new Date(a.updatedAt).getTime()
      const tB = new Date(b.updatedAt).getTime()
      return filters.sortOrder === "desc" ? tB - tA : tA - tB
    })
    return result
  }, [collections, filters.client, filters.status, filters.photographer, filters.createdBy, filters.sortOrder])

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
        c.status === "upcoming" || c.status === "in_progress"
          ? deriveStageStatusFromShootingStart(
              {
                shootingStartDate: c.config.shootingStartDate ?? c.config.shootingDate,
                shootingStartTime: c.config.shootingStartTime,
              },
              baseUI as "upcoming" | "in-progress"
            )
          : baseUI
      return {
        id: c.id,
        status: displayStatus,
        collectionName: c.config.name || "—",
        clientName,
        location: collectionLocation(c),
        startDate: start,
        endDate: end,
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
        c.status === "upcoming" || c.status === "in_progress"
          ? deriveStageStatusFromShootingStart(
              {
                shootingStartDate: c.config.shootingStartDate ?? c.config.shootingDate,
                shootingStartTime: c.config.shootingStartTime,
              },
              baseUI as "upcoming" | "in-progress"
            )
          : baseUI
      return {
        id: c.id,
        name: c.config.name || "—",
        status: displayStatus,
        client,
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
            clientOptions={clientOptions}
            photographerOptions={photographerOptions}
            createdByOptions={[]}
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
