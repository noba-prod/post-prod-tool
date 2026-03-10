"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Grid } from "@/components/custom/grid"
import { Tables, type Collection } from "@/components/custom/tables"
import { CollectionCard, type CollectionCardProps } from "@/components/custom/collection-card"
import { createCollectionsService } from "@/lib/services"
import {
  type Collection as DomainCollection,
  VIEW_STEP_IDS,
} from "@/lib/domain/collections"

type CollectionStatus = "draft" | "upcoming" | "in-progress" | "completed" | "canceled"

interface CollectionData {
  id: string
  name: string
  status: CollectionStatus
  clientId: string
  clientName: string
  reference: string
  location: string
  startDate: string
  endDate: string
  createdBy: string
  participants: number
  createdAt: Date
  progress?: number
  stepHealthStatus?: "on-track" | "on-time" | "delayed" | "at-risk"
}

function getActiveStepHealth(c: DomainCollection): "on-track" | "on-time" | "delayed" | "at-risk" {
  const statuses = c.stepStatuses
  if (!statuses || typeof statuses !== "object") return "on-track"
  for (const stepId of VIEW_STEP_IDS) {
    const entry = statuses[stepId]
    if (!entry) continue
    if (entry.stage === "in-progress" && entry.health) {
      if (entry.health === "on-time") return "on-time"
      if (entry.health === "delayed") return "delayed"
      if (entry.health === "at-risk") return "at-risk"
      return "on-track"
    }
  }
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

function mapDomainToCollectionData(c: DomainCollection): CollectionData {
  const location = [c.config.shootingCity, c.config.shootingCountry].filter(Boolean).join(", ") || "—"
  const startDate = c.config.shootingStartDate || "—"
  const endDate = c.config.shootingEndDate || "—"
  const status: CollectionStatus = c.status === "in_progress" ? "in-progress" : c.status
  const showProgress = status === "in-progress"
  return {
    id: c.id,
    name: c.config.name || "Untitled",
    status,
    clientId: c.config.clientEntityId || "",
    clientName: "—",
    reference: c.config.reference?.trim() || "—",
    location,
    startDate,
    endDate,
    createdBy: c.config.managerUserId || "",
    participants: c.participants?.length ?? 0,
    createdAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    ...(showProgress && {
      progress: c.completionPercentage ?? 0,
      stepHealthStatus: getActiveStepHealth(c),
    }),
  }
}

interface Filters {
  client: string | null
  status: string | null
  createdBy: string | null
  sortOrder: "asc" | "desc"
}

export default function CollectionsPreviewPage() {
  const [activeView, setActiveView] = useState<string>("Gallery")
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({
    client: null,
    status: null,
    createdBy: null,
    sortOrder: "desc",
  })

  useEffect(() => {
    const service = createCollectionsService()
    service.listCollections().then((list) => {
      setCollections(list.map(mapDomainToCollectionData))
      setLoading(false)
    }).catch(() => {
      setCollections([])
      setLoading(false)
    })
  }, [])

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterId]: prev[filterId as keyof Filters] === value ? null : value,
    }))
  }

  const handleSortChange = (order: "asc" | "desc") => {
    setFilters((prev) => ({ ...prev, sortOrder: order }))
  }

  const filteredCollections = React.useMemo(() => {
    let result = [...collections]
    if (filters.client) result = result.filter((c) => c.clientId === filters.client)
    if (filters.status) result = result.filter((c) => c.status === filters.status)
    if (filters.createdBy) result = result.filter((c) => c.createdBy === filters.createdBy)
    result.sort((a, b) => {
      const dateA = a.createdAt.getTime()
      const dateB = b.createdAt.getTime()
      return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })
    return result
  }, [collections, filters])

  const gridItems: CollectionCardProps[] = filteredCollections.map((c) => ({
    status: c.status,
    collectionName: c.name,
    clientName: `@${c.clientName}`,
    location: c.location,
    startDate: c.startDate,
    endDate: c.endDate,
    ...(c.progress !== undefined &&
      c.stepHealthStatus !== undefined && {
        progress: c.progress,
        stepHealthStatus: c.stepHealthStatus,
      }),
  }))

  const tableItems: Collection[] = filteredCollections.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    client: c.clientName.charAt(0).toUpperCase() + c.clientName.slice(1),
    jobReference: c.reference || "—",
    starting: c.startDate.charAt(0).toUpperCase() + c.startDate.slice(1),
    location: c.location.split(", ").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", "),
    participants: c.participants,
  }))

  return (
    <MainTemplate
      title="Collections"
      navBarProps={{
        variant: "noba",
        userName: "Dev Preview",
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
            clientOptions={[]}
            photographerOptions={[]}
            createdByOptions={[]}
          />
        </LayoutSection>
        <LayoutSection>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Loading collections...</p>
            </div>
          ) : (
            <>
              {activeView === "Gallery" ? (
                <Grid items={gridItems} />
              ) : (
                <Tables
                  variant="collections"
                  collectionsData={tableItems}
                  onSettings={(id) => console.log("Settings for collection:", id)}
                />
              )}
              {filteredCollections.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium text-muted-foreground">
                    No collections found
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters or create a collection from the main app
                  </p>
                </div>
              )}
            </>
          )}
        </LayoutSection>
      </Layout>
    </MainTemplate>
  )
}
