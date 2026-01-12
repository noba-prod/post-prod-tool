"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import type { Entity } from "@/components/custom/tables"

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_ENTITIES: Entity[] = [
  { id: "1", name: "Zara", type: "Client", admin: "Erika Goldner (+2)", teamMembers: 8, collections: 4 },
  { id: "2", name: "Kodak Scanner", type: "Photo Lab", admin: "Sophia Johnson", teamMembers: 3, collections: 2 },
  { id: "3", name: "Tom Haser", type: "Photographer", admin: "Kevin Brown", teamMembers: 1, collections: 1 },
  { id: "4", name: "Photo LUX", type: "Photo Agency", admin: "Sarah Davis (+1)", teamMembers: 2, collections: 2 },
  { id: "5", name: "Reveal Coruña", type: "Printer Lab", admin: "James Wilson", teamMembers: 3, collections: 6 },
  { id: "6", name: "Mango", type: "Client", admin: "Carlos García", teamMembers: 5, collections: 3 },
  { id: "7", name: "Loewe", type: "Client", admin: "Ana López", teamMembers: 4, collections: 2 },
]

// ============================================================================
// FILTER TYPES
// ============================================================================

interface Filters {
  type: string | null
  search: string
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function EntitiesPage() {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    type: null,
    search: "",
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

  // Handle filter changes
  const handleFilterChange = (filterId: string, value: string) => {
    if (filterId === "type") {
      setFilters(prev => ({
        ...prev,
        type: prev.type === value ? null : value,
      }))
    }
  }

  // Handle search changes
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  // Handle action click (New entity)
  const handleActionClick = () => {
    router.push("/create/client")
  }

  // Handle view details
  const handleViewDetails = (id: string) => {
    router.push(`/entities/${id}`)
  }

  // Filter entities
  const filteredEntities = React.useMemo(() => {
    let result = [...MOCK_ENTITIES]

    // Apply type filter
    if (filters.type) {
      result = result.filter(e => e.type.toLowerCase().replace(/\s+/g, "-") === filters.type)
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(e => 
        e.name.toLowerCase().includes(searchLower) ||
        e.type.toLowerCase().includes(searchLower) ||
        e.admin.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [filters])

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
      title="Entities"
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
            variant="entities"
            onSearchChange={handleSearchChange}
            onActionClick={handleActionClick}
            onFilterChange={handleFilterChange}
            searchPlaceholder="Search entities..."
          />
        </LayoutSection>
        <LayoutSection>
          <Tables
            variant="entities"
            entitiesData={filteredEntities}
            onViewDetails={handleViewDetails}
          />
          {filteredEntities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No entities found
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
