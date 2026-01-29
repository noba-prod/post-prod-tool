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
// CONSTANTS
// ============================================================================

const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"

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

  // Load team members: from profiles table by organization_id (Supabase) or repository (mock)
  useEffect(() => {
    async function loadTeamMembers() {
      const organizationId = userContext.user?.entityId
      if (!organizationId) {
        setTeamMembers([])
        return
      }

      setLoadingTeam(true)
      try {
        if (USE_MOCK_AUTH) {
          const { userRepository } = getRepositoryInstances()
          if (!userRepository) {
            setTeamMembers([])
            return
          }
          const users = await userRepository.listUsersByEntityId(organizationId)
          const mappedMembers: TeamMember[] = users.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName || ""}`.trim(),
            email: u.email,
            phone: u.phoneNumber,
            role: roleToLabel(u.role),
            collections: 0,
          }))
          setTeamMembers(mappedMembers)
        } else {
          // Supabase: query profiles by same organization_id via API
          const res = await fetch(`/api/entities/${organizationId}`)
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            console.warn("Failed to load team members:", err.error || res.status)
            setTeamMembers([])
            return
          }
          const data = await res.json()
          const users = data.teamMembers ?? []
          const mappedMembers: TeamMember[] = users.map((u: { id: string; firstName: string; lastName?: string; email: string; phoneNumber: string; role: string }) => ({
            id: u.id,
            name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
            email: u.email,
            phone: u.phoneNumber ?? "",
            role: roleToLabel(u.role as "admin" | "editor" | "viewer"),
            collections: 0,
          }))
          setTeamMembers(mappedMembers)
        }
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
    const organizationId = userContext.user?.entityId
    const entity = userContext.entity
    if (!organizationId || !entity) {
      toast.error("Cannot add member", {
        description: "Entity information is not available.",
      })
      return
    }

    setIsCreatingMember(true)
    try {
      if (USE_MOCK_AUTH) {
        const repos = getRepositoryInstances()
        if (!repos.userRepository) {
          throw new Error("User repository not available")
        }
        const payload: CreateUserPayload = {
          firstName: userData.firstName.trim(),
          lastName: userData.lastName?.trim() || undefined,
          email: userData.email.trim(),
          phoneNumber: `${userData.countryCode} ${userData.phoneNumber}`.trim(),
          countryCode: userData.countryCode,
          role: userData.role,
        }
        const newUser = await repos.userRepository.createUser({
          ...payload,
          entityId: organizationId,
          notes: `Team member for ${entity.name}`,
        })
        const allUsers = await repos.userRepository.listUsersByEntityId(organizationId)
        const mappedMembers: TeamMember[] = allUsers.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName || ""}`.trim(),
          email: u.email,
          phone: u.phoneNumber,
          role: roleToLabel(u.role),
          collections: 0,
        }))
        setTeamMembers(mappedMembers)
        setIsNewMemberModalOpen(false)
        toast.success("Team member added successfully", {
          description: `${newUser.firstName} ${newUser.lastName || ""}`.trim() + " has been added to the team.",
        })
        return
      }

      // Supabase: create member via API (profiles table, same organization_id)
      const res = await fetch(`/api/entities/${organizationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: userData.firstName.trim(),
          lastName: userData.lastName?.trim() || undefined,
          email: userData.email.trim(),
          phoneNumber: userData.phoneNumber.trim(),
          countryCode: userData.countryCode,
          role: userData.role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add team member")
      }
      const users = data.teamMembers ?? []
      const mappedMembers: TeamMember[] = users.map((u: { id: string; firstName: string; lastName?: string; email: string; phoneNumber: string; role: string }) => ({
        id: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
        email: u.email,
        phone: u.phoneNumber ?? "",
        role: roleToLabel(u.role as "admin" | "editor" | "viewer"),
        collections: 0,
      }))
      setTeamMembers(mappedMembers)
      setIsNewMemberModalOpen(false)
      const newUser = data.user
      toast.success("Team member added successfully", {
        description: newUser ? `${newUser.firstName ?? ""} ${newUser.lastName ?? ""}`.trim() + " has been added to the team." : "Team member added.",
      })
    } catch (error) {
      console.error("Failed to create team member:", error)
      toast.error("Failed to create team member", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreatingMember(false)
    }
  }, [userContext.user?.entityId, userContext.entity])

  // Handle delete (remove member from organization)
  const handleDelete = useCallback(async (id: string) => {
    const organizationId = userContext.user?.entityId
    if (!organizationId) {
      toast.error("Cannot remove member", { description: "Organization not available." })
      return
    }

    const member = teamMembers.find((m) => m.id === id)
    const name = member?.name || "this member"
    if (!window.confirm(`Remove ${name} from the team? They will no longer have access to this organization.`)) {
      return
    }

    try {
      if (USE_MOCK_AUTH) {
        const repos = getRepositoryInstances()
        if (!repos.userRepository) {
          toast.error("Cannot remove member", { description: "User repository not available." })
          return
        }
        const deleted = await repos.userRepository.deleteUser(id)
        if (!deleted) {
          toast.error("Member not found", { description: "The user may have already been removed." })
          return
        }
        const users = await repos.userRepository.listUsersByEntityId(organizationId)
        const mappedMembers: TeamMember[] = users.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName || ""}`.trim(),
          email: u.email,
          phone: u.phoneNumber,
          role: roleToLabel(u.role),
          collections: 0,
        }))
        setTeamMembers(mappedMembers)
        toast.success("Member removed", { description: `${name} has been removed from the team.` })
        return
      }

      const res = await fetch(`/api/entities/${organizationId}/members/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to remove member")
      }
      const users = data.teamMembers ?? []
      const mappedMembers: TeamMember[] = users.map((u: { id: string; firstName: string; lastName?: string; email: string; phoneNumber: string; role: string }) => ({
        id: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
        email: u.email,
        phone: u.phoneNumber ?? "",
        role: roleToLabel(u.role as "admin" | "editor" | "viewer"),
        collections: 0,
      }))
      setTeamMembers(mappedMembers)
      toast.success("Member removed", { description: `${name} has been removed from the team.` })
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error("Failed to remove member", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      })
    }
  }, [userContext.user?.entityId, teamMembers])

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

  // Navigate to team member profile page when row or name is clicked
  const handleEditUser = useCallback(
    (memberId: string) => {
      router.push(`/team/${memberId}`)
    },
    [router]
  )

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
                onEditUser={handleEditUser}
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
