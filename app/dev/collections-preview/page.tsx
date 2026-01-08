"use client"

import * as React from "react"
import { useState } from "react"
import { NavBar } from "@/components/custom/nav-bar"
import { Titles } from "@/components/custom/titles"
import { FilterBar } from "@/components/custom/filter-bar"
import { CollectionCard, type CollectionCardProps } from "@/components/custom/collection-card"
import { Tables, type Collection } from "@/components/custom/tables"

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
  sortOrder: "asc" | "desc"
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function CollectionsPreviewPage() {
  // View state (Gallery or List)
  const [activeView, setActiveView] = useState<string>("Gallery")
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    client: null,
    status: null,
    createdBy: null,
    sortOrder: "desc",
  })

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

  // Filter and sort collections
  const filteredCollections = React.useMemo(() => {
    let result = [...MOCK_COLLECTIONS]

    // Apply client filter
    if (filters.client) {
      result = result.filter(c => c.clientId === filters.client)
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter(c => c.status === filters.status)
    }

    // Apply createdBy filter
    if (filters.createdBy) {
      result = result.filter(c => c.createdBy === filters.createdBy)
    }

    // Apply sort
    result.sort((a, b) => {
      const dateA = a.createdAt.getTime()
      const dateB = b.createdAt.getTime()
      return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })

    return result
  }, [filters])

  // Transform to Grid format
  const gridItems: CollectionCardProps[] = filteredCollections.map(c => ({
    status: c.status,
    collectionName: c.name,
    clientName: `@${c.clientName}`,
    location: c.location,
    startDate: c.startDate,
    endDate: c.endDate,
  }))

  // Transform to Table format
  const tableItems: Collection[] = filteredCollections.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    client: c.clientName.charAt(0).toUpperCase() + c.clientName.slice(1),
    starting: c.startDate.charAt(0).toUpperCase() + c.startDate.slice(1),
    location: c.location.split(", ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", "),
    participants: c.participants,
  }))

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Fixed NavBar */}
      <NavBar
        variant="noba"
        userName="Martin Becerra"
        organization="noba"
        role="admin"
        isAdmin
        hasNotifications={false}
        className="sticky top-0 z-50"
      />

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-6 py-8">
          {/* Title */}
          <Titles type="main-section" title="Collections" />

          {/* Filter Bar + Content */}
          <div className="flex flex-col gap-5">
            {/* Filter Bar */}
            <FilterBar
              variant="collections"
              activeView={activeView}
              onViewChange={setActiveView}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              showAction={false}
            />

            {/* Content: Grid or Table */}
            {activeView === "Gallery" ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {gridItems.map((item, index) => (
                  <CollectionCard
                    key={index}
                    {...item}
                    className="!w-full h-[192px]"
                  />
                ))}
              </div>
            ) : (
              <Tables
                variant="collections"
                collectionsData={tableItems}
                onSettings={(id) => console.log("Settings for collection:", id)}
              />
            )}

            {/* Empty State */}
            {filteredCollections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium text-muted-foreground">
                  No collections found
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

