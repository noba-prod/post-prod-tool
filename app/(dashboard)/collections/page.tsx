"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Grid } from "@/components/custom/grid"
import { Tables } from "@/components/custom/tables"
import { Button } from "@/components/ui/button"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import { CollectionCard, type CollectionCardProps } from "@/components/custom/collection-card"
import type { Collection as TableCollection } from "@/components/custom/tables"
import { createCollectionsService, createEntityCreationService, getRepositoryInstances } from "@/lib/services"
import type { Collection } from "@/lib/domain/collections"

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
  const authAdapter = useAuthAdapter()
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
  useEffect(() => {
    if (!session) return
    const service = createCollectionsService()
    service.listCollections().then(setCollections)
  }, [session])

  // Load client and photographer options for filters (registered entities)
  useEffect(() => {
    if (!session) return
    createEntityCreationService()
    const entityRepo = getRepositoryInstances().entityRepository
    if (!entityRepo) return
    entityRepo.getAllEntities().then((entities) => {
      const clients = entities
        .filter((e) => e.type === "client")
        .map((e) => ({ id: e.id, name: e.name }))
      const photographers = entities
        .filter((e) => e.type === "self-photographer")
        .map((e) => ({ id: e.id, name: e.name }))
      setClientOptions(clients)
      setPhotographerOptions(photographers)
    })
  }, [session])

  // Resolve client display names for collections (entity by clientEntityId)
  useEffect(() => {
    if (collections.length === 0) {
      setClientNamesByEntityId({})
      return
    }
    createEntityCreationService() // ensure entity repo exists
    const entityRepo = getRepositoryInstances().entityRepository
    if (!entityRepo) {
      setClientNamesByEntityId({})
      return
    }
    const ids = [...new Set(collections.map((c) => c.config.clientEntityId).filter(Boolean))]
    const load = async () => {
      const map: Record<string, string> = {}
      await Promise.all(
        ids.map(async (eid) => {
          const entity = await entityRepo.getEntityById(eid)
          if (entity?.name) map[eid] = entity.name
        })
      )
      setClientNamesByEntityId(map)
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
      return {
        id: c.id,
        status: mapStatusToUI(c.status),
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
      return {
        id: c.id,
        name: c.config.name || "—",
        status: mapStatusToUI(c.status),
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
                    Create your first collection to get started.
                  </p>
                  <Button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("noba:open-create-collection"))
                      }
                    }}
                  >
                    Create new
                  </Button>
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
