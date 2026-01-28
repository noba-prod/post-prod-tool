"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Grid } from "@/components/custom/grid"
import { Tables } from "@/components/custom/tables"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import { CollectionCard, type CollectionCardProps } from "@/components/custom/collection-card"
import type { Collection } from "@/components/custom/tables"
import { createCollectionsService, createEntityCreationService, getRepositoryInstances } from "@/lib/services"
import type { CollectionDraft } from "@/lib/domain/collections"

// ============================================================================
// MOCK DATA
// ============================================================================

type CollectionStatus = "draft" | "upcoming" | "in-progress" | "completed" | "canceled"

interface CollectionData {
  id: string
  name: string
  status: CollectionStatus
  clientId: string
  clientName: string
  location: string
  startDate: string
  endDate: string
  createdBy: string
  participants: number
  createdAt: Date
}

const MOCK_COLLECTIONS: CollectionData[] = [
  {
    id: "1",
    name: "kids summer'25",
    status: "draft",
    clientId: "1",
    clientName: "zara",
    location: "a coruña, spain",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
    createdBy: "1",
    participants: 0,
    createdAt: new Date("2025-01-05"),
  },
  {
    id: "2",
    name: "Sakura: Cherry blossom",
    status: "upcoming",
    clientId: "2",
    clientName: "loewe",
    location: "tokyo, japan",
    startDate: "apr 4, 2025",
    endDate: "apr 14, 2025",
    createdBy: "2",
    participants: 6,
    createdAt: new Date("2025-01-04"),
  },
  {
    id: "3",
    name: "Beach resort 2025",
    status: "in-progress",
    clientId: "3",
    clientName: "maisondumonde",
    location: "miami, usa",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
    createdBy: "1",
    participants: 8,
    createdAt: new Date("2025-01-03"),
  },
  {
    id: "4",
    name: "streetwear collection 2025",
    status: "completed",
    clientId: "4",
    clientName: "mango",
    location: "los angeles, usa",
    startDate: "nov 24, 2025",
    endDate: "dec 4, 2025",
    createdBy: "3",
    participants: 4,
    createdAt: new Date("2025-01-02"),
  },
  {
    id: "5",
    name: "luxury evening coffee 2025",
    status: "draft",
    clientId: "5",
    clientName: "dior",
    location: "paris, france",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
    createdBy: "2",
    participants: 0,
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "6",
    name: "Speed run 2025",
    status: "completed",
    clientId: "1",
    clientName: "zaraathleticz",
    location: "madrid, spain",
    startDate: "nov 19, 2025",
    endDate: "nov 29, 2025",
    createdBy: "1",
    participants: 1,
    createdAt: new Date("2024-12-28"),
  },
  {
    id: "7",
    name: "spring/summer 2025",
    status: "draft",
    clientId: "3",
    clientName: "ecoalf",
    location: "menorca, spain",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
    createdBy: "4",
    participants: 0,
    createdAt: new Date("2024-12-25"),
  },
  {
    id: "8",
    name: "fall lookbook 2025",
    status: "canceled",
    clientId: "4",
    clientName: "renatta&go",
    location: "madrid, spain",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
    createdBy: "5",
    participants: 0,
    createdAt: new Date("2024-12-20"),
  },
  {
    id: "9",
    name: "Holiday special 2025",
    status: "upcoming",
    clientId: "2",
    clientName: "loewe",
    location: "barcelona, spain",
    startDate: "jan 10, 2026",
    endDate: "jan 20, 2026",
    createdBy: "1",
    participants: 5,
    createdAt: new Date("2025-01-06"),
  },
  {
    id: "10",
    name: "Resort collection 2026",
    status: "in-progress",
    clientId: "5",
    clientName: "dior",
    location: "cannes, france",
    startDate: "jan 5, 2026",
    endDate: "jan 15, 2026",
    createdBy: "3",
    participants: 12,
    createdAt: new Date("2025-01-07"),
  },
]

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
 * Domain: "draft" | "upcoming" | "in_progress"
 * UI: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
 */
function mapStatusToUI(status: CollectionDraft["status"]): "draft" | "upcoming" | "in-progress" {
  if (status === "in_progress") return "in-progress"
  return status
}

/**
 * Location for card: "City, Country".
 * Same source as Shooting setup → Location (OptionPicker City + OptionPicker Country):
 * config.shootingCity and config.shootingCountry.
 * Shown as-is (no transform) so labels like "A Coruña", "United Kingdom" stay correct.
 */
function draftLocation(draft: CollectionDraft): string {
  const { config } = draft
  if (!config.shootingCity?.trim() && !config.shootingCountry?.trim()) return "—"
  const city = config.shootingCity?.trim() ?? "—"
  const country = config.shootingCountry?.trim() ?? "—"
  return `${city}, ${country}`
}

/** Comienzo de producción = shooting start (solo cuando está completado ese paso); si no, TBD. Final = deadline (modal). */
function draftDates(draft: CollectionDraft): { start: string; end: string } {
  const { config } = draft
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
  const [drafts, setDrafts] = useState<CollectionDraft[]>([])
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

  // Fetch drafts from service (single source of truth for list)
  useEffect(() => {
    if (!session) return
    const service = createCollectionsService()
    service.listDrafts().then(setDrafts)
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

  // Resolve client display names for drafts (entity by clientEntityId)
  useEffect(() => {
    if (drafts.length === 0) {
      setClientNamesByEntityId({})
      return
    }
    createEntityCreationService() // ensure entity repo exists
    const entityRepo = getRepositoryInstances().entityRepository
    if (!entityRepo) {
      setClientNamesByEntityId({})
      return
    }
    const ids = [...new Set(drafts.map((d) => d.config.clientEntityId).filter(Boolean))]
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
  }, [drafts])

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

  // When we have real drafts, use them (most recent first); otherwise fallback to mock
  const usingDrafts = drafts.length > 0

  const filteredDrafts = React.useMemo(() => {
    if (!usingDrafts) return []
    let result = [...drafts]
    if (filters.client) {
      result = result.filter((d) => d.config.clientEntityId === filters.client)
    }
    if (filters.status) {
      // Map UI status (with hyphen) to domain status (with underscore) for filtering
      const domainStatus = filters.status === "in-progress" ? "in_progress" : filters.status
      result = result.filter((d) => d.status === domainStatus)
    }
    if (filters.photographer) {
      result = result.filter((d) =>
        d.participants.some(
          (p) => p.role === "photographer" && p.entityId === filters.photographer
        )
      )
    }
    result.sort((a, b) => {
      const tA = new Date(a.updatedAt).getTime()
      const tB = new Date(b.updatedAt).getTime()
      return filters.sortOrder === "desc" ? tB - tA : tA - tB
    })
    return result
  }, [drafts, usingDrafts, filters.client, filters.status, filters.photographer, filters.sortOrder])

  const filteredCollections = React.useMemo(() => {
    if (usingDrafts) return []
    let result = [...MOCK_COLLECTIONS]
    if (filters.client) result = result.filter(c => c.clientId === filters.client)
    if (filters.status) result = result.filter(c => c.status === filters.status)
    if (filters.createdBy) result = result.filter(c => c.createdBy === filters.createdBy)
    result.sort((a, b) => {
      const dateA = a.createdAt.getTime()
      const dateB = b.createdAt.getTime()
      return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })
    return result
  }, [usingDrafts, filters])

  /** Navigate to collection: draft → setup flow, published → view flow */
  const handleCollectionClick = React.useCallback(
    (id: string, status: CollectionDraft["status"]) => {
      if (status === "draft") {
        router.push(`/collections/create/${id}`)
      } else {
        router.push(`/collections/${id}`)
      }
    },
    [router]
  )

  const gridItems: CollectionCardProps[] = React.useMemo(() => {
    if (usingDrafts) {
      return filteredDrafts.map(d => {
        const { start, end } = draftDates(d)
        const clientName = clientNamesByEntityId[d.config.clientEntityId]
          ? `@${clientNamesByEntityId[d.config.clientEntityId].toLowerCase()}`
          : "—"
        return {
          id: d.id,
          status: mapStatusToUI(d.status),
          collectionName: d.config.name || "—",
          clientName,
          location: draftLocation(d),
          startDate: start,
          endDate: end,
          onClick: () => handleCollectionClick(d.id, d.status),
        }
      })
    }
    return filteredCollections.map(c => {
      const isDraft = c.status === "draft"
      const onClick = () => {
        if (isDraft) router.push(`/collections/create/${c.id}`)
        else router.push(`/collections/${c.id}`)
      }
      return {
        id: c.id,
        status: c.status,
        collectionName: c.name,
        clientName: `@${c.clientName}`,
        location: c.location,
        startDate: c.startDate,
        endDate: c.endDate,
        onClick,
      }
    })
  }, [usingDrafts, filteredDrafts, filteredCollections, clientNamesByEntityId, router, handleCollectionClick])

  const tableItems: Collection[] = React.useMemo(() => {
    if (usingDrafts) {
      return filteredDrafts.map(d => {
        const { start } = draftDates(d)
        const loc = draftLocation(d)
        const clientName = clientNamesByEntityId[d.config.clientEntityId]
        const client = clientName
          ? clientName.charAt(0).toUpperCase() + clientName.slice(1)
          : "—"
        return {
          id: d.id,
          name: d.config.name || "—",
          status: mapStatusToUI(d.status),
          client,
          starting: start,
          location: loc !== "—" ? loc.split(", ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "—",
          participants: d.participants.length,
        }
      })
    }
    return filteredCollections.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      client: c.clientName.charAt(0).toUpperCase() + c.clientName.slice(1),
      starting: c.startDate.charAt(0).toUpperCase() + c.startDate.slice(1),
      location: c.location.split(", ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", "),
      participants: c.participants,
    }))
  }, [usingDrafts, filteredDrafts, filteredCollections, clientNamesByEntityId])

  const hasItems = usingDrafts ? filteredDrafts.length > 0 : filteredCollections.length > 0

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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No collections found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters
              </p>
            </div>
          )}
        </LayoutSection>
      </Layout>
    </MainTemplate>
  )
}
