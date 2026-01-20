"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { UserCreationForm, type UserFormData } from "@/components/custom/user-creation-form"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import type { TeamMember } from "@/components/custom/tables"
import { useUserContext } from "@/lib/contexts/user-context"
import { getRepositoryInstances } from "@/lib/services"
import { roleToLabel } from "@/lib/types"
import { toast } from "sonner"
import type { CreateUserPayload } from "@/lib/types"

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
  const userContext = useUserContext()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  
  // Modal state for new member
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false)
  const [isCreatingMember, setIsCreatingMember] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    role: null,
    search: "",
  })

  // Load team members from repository
  useEffect(() => {
    async function loadTeamMembers() {
      if (!userContext.user?.entityId) {
        setTeamMembers([])
        return
      }

      setLoadingTeam(true)
      try {
        const { userRepository } = getRepositoryInstances()
        if (!userRepository) {
          console.warn("User repository not available")
          setTeamMembers([])
          return
        }

        const users = await userRepository.listUsersByEntityId(userContext.user.entityId)
        
        // Map User[] to TeamMember[]
        const mappedMembers: TeamMember[] = users.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName || ""}`.trim(),
          email: u.email,
          phone: u.phoneNumber,
          role: roleToLabel(u.role),
          collections: 0, // TODO: Calculate from collections when available
        }))

        setTeamMembers(mappedMembers)
      } catch (error) {
        console.error("Failed to load team members:", error)
        setTeamMembers([])
      } finally {
        setLoadingTeam(false)
      }
    }

    if (!userContext.loading && userContext.user) {
      loadTeamMembers()
    }
  }, [userContext.user?.entityId, userContext.loading])

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
  const handleActionClick = useCallback(() => {
    if (!userContext.user?.entityId || !userContext.entity) {
      toast.error("Cannot add member", {
        description: "Entity information is not available.",
      })
      return
    }
    setIsNewMemberModalOpen(true)
  }, [userContext.user?.entityId, userContext.entity])

  // Handle new member submit
  const handleNewMemberSubmit = useCallback(async (userData: UserFormData) => {
    if (!userContext.user?.entityId || !userContext.entity) {
      toast.error("Cannot add member", {
        description: "Entity information is not available.",
      })
      return
    }

    setIsCreatingMember(true)
    try {
      const repos = getRepositoryInstances()
      if (!repos.userRepository) {
        throw new Error("User repository not available")
      }

      // Create user payload
      const payload: CreateUserPayload = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName?.trim() || undefined,
        email: userData.email.trim(),
        phoneNumber: `${userData.countryCode} ${userData.phoneNumber}`.trim(),
        countryCode: userData.countryCode,
        role: userData.role,
      }

      // Create the team member
      const newUser = await repos.userRepository.createUser({
        ...payload,
        entityId: userContext.user.entityId,
        notes: `Team member for ${userContext.entity.name}`,
      })

      // Refresh team members list
      const allUsers = await repos.userRepository.listUsersByEntityId(userContext.user.entityId)
      
      // Map to TeamMember format
      const mappedMembers: TeamMember[] = allUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName || ""}`.trim(),
        email: u.email,
        phone: u.phoneNumber,
        role: roleToLabel(u.role),
        collections: 0,
      }))

      setTeamMembers(mappedMembers)

      // Close modal
      setIsNewMemberModalOpen(false)

      // Show success toast
      toast.success("Team member added successfully", {
        description: `${newUser.firstName} ${newUser.lastName || ""}`.trim() + " has been added to the team.",
      })
    } catch (error) {
      console.error("Failed to create team member:", error)
      toast.error("Failed to add team member", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreatingMember(false)
    }
  }, [userContext.user?.entityId, userContext.entity])

  // Handle delete
  const handleDelete = (id: string) => {
    console.log("Delete member:", id)
  }

  // Filter team members
  const filteredMembers = React.useMemo(() => {
    let result = [...teamMembers]

    // Apply role filter
    if (filters.role) {
      result = result.filter(m => m.role.toLowerCase() === filters.role?.toLowerCase())
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
  }, [teamMembers, filters])

  // Permissions based on user role
  const canManageTeam = userContext.user?.role === "admin" || userContext.user?.role === "editor"
  const canDelete = userContext.user?.role === "admin" || userContext.user?.role === "editor"

  if (loading || userContext.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Don't show Team page for self-photographer (should be handled by navigation, but defensive check)
  if (!userContext.canAccessTeam) {
    return (
      <MainTemplate>
        <LayoutSection>
          <div className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">Team section is not available for your entity type.</p>
          </div>
        </LayoutSection>
      </MainTemplate>
    )
  }

  return (
    <MainTemplate>
      <Layout padding="none" showSeparators={false}>
        <LayoutSection>
          {/* Custom title with entity name */}
          <div className="flex items-center justify-between w-full mb-5">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-semibold text-foreground">
                Team
              </span>
              {userContext.entity && (
                <span className="text-4xl font-semibold text-lime-500">
                  @{userContext.entity.name.toLowerCase().replace(/\s+/g, "")}
                </span>
              )}
            </div>
          </div>
        </LayoutSection>
        <LayoutSection>
          <FilterBar
            variant="members"
            onSearchChange={handleSearchChange}
            onActionClick={handleActionClick}
            onFilterChange={handleFilterChange}
            searchPlaceholder="Search team members..."
            actionDisabled={!canManageTeam}
          />
        </LayoutSection>
        <LayoutSection>
          {loadingTeam ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Loading team members...</p>
            </div>
          ) : (
            <>
              <Tables
                variant="team-members"
                teamMembersData={filteredMembers}
                onDelete={canDelete ? handleDelete : undefined}
              />
              {filteredMembers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium text-muted-foreground">
                    {teamMembers.length === 0 
                      ? "No team members yet"
                      : "No team members found"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {teamMembers.length === 0
                      ? "Add your first team member to get started"
                      : "Try adjusting your filters"
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </LayoutSection>
      </Layout>

      {/* New Team Member Modal */}
      {userContext.entity && (
        <UserCreationForm
          open={isNewMemberModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsNewMemberModalOpen(false)
          }}
          entity={{
            type: userContext.entity.type,
            name: userContext.entity.name,
          }}
          isAdminUser={false}
          onSubmit={handleNewMemberSubmit}
          onCancel={() => setIsNewMemberModalOpen(false)}
          primaryLabel="Register member"
          secondaryLabel="Cancel"
        />
      )}
    </MainTemplate>
  )
}
