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
import type { TeamMember } from "@/components/custom/tables"

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: "1", name: "Erika Goldner", email: "erika.goldner@zara.com", phone: "+34 649 393 291", role: "Admin", collections: 0 },
  { id: "2", name: "Sophia Johnson", email: "sophia.johnson@zara.com", phone: "+34 672 271 218", role: "Viewer", collections: 0 },
  { id: "3", name: "Aiden Smith", email: "kevin.brown@zara.com", phone: "555-555-5555", role: "Editor", collections: 0 },
  { id: "4", name: "Mia Clark", email: "sarah.davis@zara.com", phone: "666-666-6666", role: "Viewer", collections: 0 },
  { id: "5", name: "Noah Garcia", email: "james.wilson@zara.com", phone: "777-777-7777", role: "Viewer", collections: 0 },
  { id: "6", name: "Emma Martinez", email: "emma.martinez@zara.com", phone: "+34 611 222 333", role: "Editor", collections: 2 },
  { id: "7", name: "Lucas Rodriguez", email: "lucas.rodriguez@zara.com", phone: "+34 644 555 666", role: "Admin", collections: 1 },
]

// ============================================================================
// FILTER TYPES
// ============================================================================

interface Filters {
  role: string | null
  search: string
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function TeamPage() {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    role: null,
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
    if (filterId === "role") {
      setFilters(prev => ({
        ...prev,
        role: prev.role === value ? null : value,
      }))
    }
  }

  // Handle search changes
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  // Handle action click (New member)
  const handleActionClick = () => {
    // TODO: Implement new member modal or page
    console.log("New member clicked")
  }

  // Handle delete
  const handleDelete = (id: string) => {
    console.log("Delete member:", id)
  }

  // Filter team members
  const filteredMembers = React.useMemo(() => {
    let result = [...MOCK_TEAM_MEMBERS]

    // Apply role filter
    if (filters.role) {
      result = result.filter(m => m.role.toLowerCase() === filters.role)
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower) ||
        m.phone.includes(filters.search)
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
      title="Team"
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
            variant="members"
            onSearchChange={handleSearchChange}
            onActionClick={handleActionClick}
            onFilterChange={handleFilterChange}
            searchPlaceholder="Search team members..."
          />
        </LayoutSection>
        <LayoutSection>
          <Tables
            variant="team-members"
            teamMembersData={filteredMembers}
            onDelete={handleDelete}
          />
          {filteredMembers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No team members found
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
