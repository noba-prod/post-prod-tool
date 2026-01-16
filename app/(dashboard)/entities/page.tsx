"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { CreateEntityCommand } from "@/components/custom/create-entity-command"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import type { Entity } from "@/components/custom/tables"

// Service imports
import { createEntitiesListService } from "@/lib/services"

// ============================================================================
// TOAST ON NAVIGATION - Check for pending toast on page load
// ============================================================================

const PENDING_TOAST_KEY = "noba_pending_toast"

interface PendingToast {
  type: "success" | "error"
  title: string
  description: string
}

function consumePendingToast(): PendingToast | null {
  if (typeof window === "undefined") return null
  const stored = sessionStorage.getItem(PENDING_TOAST_KEY)
  if (stored) {
    sessionStorage.removeItem(PENDING_TOAST_KEY)
    try {
      return JSON.parse(stored) as PendingToast
    } catch {
      return null
    }
  }
  return null
}

// ============================================================================
// ENTITY OPTIONS (excludes Collection for entities page)
// ============================================================================

const ENTITIES_PAGE_OPTIONS: Array<"client" | "self-photographer" | "agency" | "photo-lab" | "edition-studio" | "hand-print-lab"> = [
  "client",
  "self-photographer",
  "agency",
  "photo-lab",
  "edition-studio",
  "hand-print-lab",
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
  
  // Entities data from repository
  const [entities, setEntities] = useState<Entity[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    type: null,
    search: "",
  })

  // Load entities from repository
  const loadEntities = useCallback(async () => {
    setLoadingEntities(true)
    try {
      const service = createEntitiesListService()
      const items = await service.listEntities()
      
      // Map EntityListItem to Entity type expected by Tables component
      const mappedEntities: Entity[] = items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type as Entity["type"],
        admin: item.admin,
        teamMembers: item.teamMembers,
        collections: item.collections,
      }))
      
      setEntities(mappedEntities)
    } catch (error) {
      console.error("Failed to load entities:", error)
    } finally {
      setLoadingEntities(false)
    }
  }, [])

  // Auth check and initial load
  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await authAdapter.getSession()
      if (!currentSession) {
        router.push("/auth/login")
        return
      }
      setSession(currentSession)
      setLoading(false)
      
      // Load entities after auth
      loadEntities()
      
      // Check for pending toast (from navbar creation flow)
      const pendingToast = consumePendingToast()
      if (pendingToast) {
        if (pendingToast.type === "success") {
          toast.success(pendingToast.title, {
            description: pendingToast.description,
          })
        } else {
          toast.error(pendingToast.title, {
            description: pendingToast.description,
          })
        }
      }
    }
    checkSession()
  }, [router, authAdapter, loadEntities])

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

  // Handle view details
  const handleViewDetails = (id: string) => {
    router.push(`/entities/${id}`)
  }

  // Handle entity created - refresh the list
  const handleEntityCreated = useCallback(() => {
    loadEntities()
  }, [loadEntities])

  // Filter entities
  const filteredEntities = React.useMemo(() => {
    let result = [...entities]

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
  }, [entities, filters])

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
          {/* Custom filter bar with CreateEntityCommand */}
          <div className="flex items-center justify-between w-full h-10">
            {/* Left side: FilterBar without action button */}
            <div className="flex-1">
              <FilterBar
                variant="entities"
                onSearchChange={handleSearchChange}
                onFilterChange={handleFilterChange}
                searchPlaceholder="Search entities..."
                showAction={false}
              />
            </div>
            
            {/* Right side: CreateEntityCommand (excludes Collection) */}
            <CreateEntityCommand
              allowedOptions={ENTITIES_PAGE_OPTIONS}
              buttonLabel="New entity"
              popoverAlign="end"
              redirectAfterCreate={false}
              onCreated={handleEntityCreated}
            />
          </div>
        </LayoutSection>
        <LayoutSection>
          {loadingEntities ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Loading entities...</p>
            </div>
          ) : (
            <>
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
                    {entities.length === 0 
                      ? "Create your first entity to get started"
                      : "Try adjusting your filters"
                    }
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
