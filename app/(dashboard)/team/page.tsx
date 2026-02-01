"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { UserCreationForm, type UserFormData } from "@/components/custom/user-creation-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import type { TeamMember } from "@/components/custom/tables"
import { useUserContext } from "@/lib/contexts/user-context"
import { getRepositoryInstances } from "@/lib/services"
import { roleToLabel } from "@/lib/types"
import { toast } from "sonner"
import type { CreateUserPayload, User } from "@/lib/types"
import { mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import { createTeamMemberInvitation } from "@/app/actions/team-invite"

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
  
  // Modal state for view/edit team member (row or name click)
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberUserData, setMemberUserData] = useState<User | null>(null)
  const [loadingMemberData, setLoadingMemberData] = useState(false)
  const [isUpdatingMember, setIsUpdatingMember] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  
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
            role: roleToLabel(u.role) as TeamMember["role"],
            collections: 0,
            status: "Active",
          }))
          setTeamMembers(mappedMembers)
        } else {
          // Supabase: query profiles by same organization_id via API
          const res = await fetch(`/api/organizations/${organizationId}`)
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            console.warn("Failed to load team members:", err.error || res.status)
            setTeamMembers([])
            return
          }
          const data = await res.json()
          const users = data.teamMembers ?? []
          const mappedMembers: TeamMember[] = users.map(
            (u: {
              id: string
              firstName: string
              lastName?: string
              email: string
              phoneNumber: string
              role: string
              status?: "Invite sent" | "Active"
            }) => ({
              id: u.id,
              name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
              email: u.email,
              phone: u.phoneNumber ?? "",
              role: roleToLabel(u.role as "admin" | "editor" | "viewer") as TeamMember["role"],
              collections: 0,
              status: u.status ?? "Active",
            })
          )
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
          role: roleToLabel(u.role) as TeamMember["role"],
          collections: 0,
          status: "Active",
        }))
        setTeamMembers(mappedMembers)
        setIsNewMemberModalOpen(false)
        toast.success("Team member added successfully", {
          description: `${newUser.firstName} ${newUser.lastName || ""}`.trim() + " has been added to the team.",
        })
        return
      }

      // noba* (internal org): create profile in DB first so they appear in the table, then send invitation email
      const isNobaOrg = entity.name?.trim() === "noba*"
      if (isNobaOrg) {
        const res = await fetch(`/api/organizations/${organizationId}/members`, {
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
        const inviteResult = await createTeamMemberInvitation(
          organizationId,
          userData.email.trim(),
          userData.role as "admin" | "editor" | "viewer"
        )
        if (!inviteResult.success) {
          toast.warning("Member created but invitation failed", {
            description: inviteResult.error,
          })
        }
        const users = data.teamMembers ?? []
        const mappedMembers: TeamMember[] = users.map(
          (u: {
            id: string
            firstName: string
            lastName?: string
            email: string
            phoneNumber: string
            role: string
            status?: "Invite sent" | "Active"
          }) => ({
            id: u.id,
            name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
            email: u.email,
            phone: u.phoneNumber ?? "",
            role: roleToLabel(u.role as "admin" | "editor" | "viewer") as TeamMember["role"],
            collections: 0,
            status: u.status ?? "Invite sent",
          })
        )
        setTeamMembers(mappedMembers)
        setIsNewMemberModalOpen(false)
        toast.success("Team member added", {
          description: inviteResult.success
            ? inviteResult.message
            : "They appear in the table. You can resend the invite later if needed.",
        })
        return
      }

      // Supabase: other orgs – create member via API (profiles table, same organization_id)
      const res = await fetch(`/api/organizations/${organizationId}/members`, {
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
      const mappedMembers: TeamMember[] = users.map(
        (u: {
          id: string
          firstName: string
          lastName?: string
          email: string
          phoneNumber: string
          role: string
          status?: "Invite sent" | "Active"
        }) => ({
          id: u.id,
          name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email,
          phone: u.phoneNumber ?? "",
          role: roleToLabel(u.role as "admin" | "editor" | "viewer") as TeamMember["role"],
          collections: 0,
          status: u.status ?? "Active",
        })
      )
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

  // Handle delete (remove member from organization). No in-function confirm; use delete confirm dialog when invoked from modal.
  const handleDelete = useCallback(async (id: string) => {
    const organizationId = userContext.user?.entityId
    if (!organizationId) {
      toast.error("Cannot remove member", { description: "Organization not available." })
      return
    }

    const member = teamMembers.find((m) => m.id === id)
    const name = member?.name || "this member"

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
          role: roleToLabel(u.role) as TeamMember["role"],
          collections: 0,
          status: "Active",
        }))
        setTeamMembers(mappedMembers)
        toast.success("Member removed", { description: `${name} has been removed from the team.` })
        return
      }

      const res = await fetch(`/api/organizations/${organizationId}/members/${id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to remove member")
      }
      const users = data.teamMembers ?? []
      const mappedMembers: TeamMember[] = users.map(
        (u: {
          id: string
          firstName: string
          lastName?: string
          email: string
          phoneNumber: string
          role: string
          status?: "Invite sent" | "Active"
        }) => ({
          id: u.id,
          name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email,
          phone: u.phoneNumber ?? "",
          role: roleToLabel(u.role as "admin" | "editor" | "viewer") as TeamMember["role"],
          collections: 0,
          status: u.status ?? "Active",
        })
      )
      setTeamMembers(mappedMembers)
      toast.success("Member removed", { description: `${name} has been removed from the team.` })
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error("Failed to remove member", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      })
    }
  }, [userContext.user?.entityId, teamMembers])

  // Close member detail modal (defined before handleConfirmDeleteFromModal so it can be used there)
  const handleCloseUserDetailModal = useCallback(() => {
    setIsUserDetailModalOpen(false)
    setSelectedMemberId(null)
    setMemberUserData(null)
  }, [])

  // Confirm delete from modal: run delete then close modals
  const handleConfirmDeleteFromModal = useCallback(async () => {
    if (!selectedMemberId) return
    await handleDelete(selectedMemberId)
    handleCloseUserDetailModal()
    setIsDeleteConfirmOpen(false)
  }, [selectedMemberId, handleDelete, handleCloseUserDetailModal])

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

  // Open modal with team member data when row or name is clicked (no navigation)
  const handleEditUser = useCallback(
    async (memberId: string) => {
      setSelectedMemberId(memberId)
      setIsUserDetailModalOpen(true)
      setMemberUserData(null)
      setLoadingMemberData(true)
      try {
        if (USE_MOCK_AUTH) {
          const repos = getRepositoryInstances()
          if (!repos.userRepository) {
            setMemberUserData(null)
            return
          }
          const u = await repos.userRepository.getUserById(memberId)
          if (u && userContext.user?.entityId && u.entityId === userContext.user.entityId) {
            setMemberUserData(u)
          } else {
            setMemberUserData(null)
          }
        } else {
          const res = await fetch(`/api/users/${memberId}`)
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            if (res.status === 404) setMemberUserData(null)
            else toast.error("Failed to load member", { description: data.error ?? "Unknown error" })
            return
          }
          const data = await res.json()
          setMemberUserData(data.user)
        }
      } catch (error) {
        console.error("Failed to load member:", error)
        toast.error("Failed to load member", {
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        })
        setMemberUserData(null)
      } finally {
        setLoadingMemberData(false)
      }
    },
    [userContext.user?.entityId]
  )

  // If load finished and no member data (e.g. 404), close modal
  useEffect(() => {
    if (!loadingMemberData && isUserDetailModalOpen && selectedMemberId && !memberUserData) {
      toast.error("Member not found", { description: "The team member could not be loaded." })
      handleCloseUserDetailModal()
    }
  }, [loadingMemberData, isUserDetailModalOpen, selectedMemberId, memberUserData, handleCloseUserDetailModal])

  // Update team member from modal (admin only)
  const handleUpdateMemberFromModal = useCallback(
    async (userData: UserFormData) => {
      if (!selectedMemberId || !userContext.user?.entityId) return
      setIsUpdatingMember(true)
      try {
        const formDataForPayload = {
          ...userData,
          entity: userData.entity && userData.entity.type !== "self-photographer"
            ? { type: userData.entity.type as import("@/lib/types").StandardEntityType, name: userData.entity.name }
            : null,
        }
        const payload = mapFormToUpdateUserPayload(formDataForPayload)
        if (USE_MOCK_AUTH) {
          const repos = getRepositoryInstances()
          if (!repos.userRepository) throw new Error("User repository not available")
          const updated = await repos.userRepository.updateUser(selectedMemberId, payload)
          if (updated) {
            const users = await repos.userRepository.listUsersByEntityId(userContext.user.entityId!)
            const mapped: TeamMember[] = users.map((u) => ({
              id: u.id,
              name: `${u.firstName} ${u.lastName || ""}`.trim(),
              email: u.email,
              phone: u.phoneNumber,
              role: roleToLabel(u.role) as TeamMember["role"],
              collections: 0,
              status: "Active",
            }))
            setTeamMembers(mapped)
            handleCloseUserDetailModal()
            toast.success("User updated", {
              description: `${updated.firstName} ${updated.lastName ?? ""}`.trim() + " has been updated.",
            })
          } else throw new Error("User not found")
        } else {
          const res = await fetch(`/api/users/${selectedMemberId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error ?? "Failed to update user")
          const listRes = await fetch(`/api/organizations/${userContext.user.entityId}`)
          if (listRes.ok) {
            const listData = await listRes.json()
            const users = listData.teamMembers ?? []
            const mapped: TeamMember[] = users.map(
              (u: {
                id: string
                firstName: string
                lastName?: string
                email: string
                phoneNumber: string
                role: string
                status?: "Invite sent" | "Active"
              }) => ({
                id: u.id,
                name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
                email: u.email,
                phone: u.phoneNumber ?? "",
                role: roleToLabel(u.role as "admin" | "editor" | "viewer") as TeamMember["role"],
                collections: 0,
                status: u.status ?? "Active",
              })
            )
            setTeamMembers(mapped)
          }
          handleCloseUserDetailModal()
          toast.success("User updated", {
            description: `${data.user?.firstName ?? ""} ${data.user?.lastName ?? ""}`.trim() + " has been updated.",
          })
        }
      } catch (error) {
        console.error("Failed to update user:", error)
        toast.error("Failed to update user", {
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        })
      } finally {
        setIsUpdatingMember(false)
      }
    },
    [selectedMemberId, userContext.user?.entityId, handleCloseUserDetailModal]
  )

  // Permissions based on user role: only admin can edit; editor/viewer can only view
  const isAdmin = userContext.user?.role === "admin"
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

      {/* View/Edit Team Member Modal (row or name click): admin can edit/delete, editor/viewer view only */}
      {userContext.entity && (
        <UserCreationForm
          open={isUserDetailModalOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseUserDetailModal()
          }}
          mode="edit"
          entity={{
            type: userContext.entity.type,
            name: userContext.entity.name,
          }}
          initialUserData={memberUserData ?? undefined}
          disabled={!isAdmin}
          onSubmit={handleUpdateMemberFromModal}
          onCancel={handleCloseUserDetailModal}
          onDeleteClick={isAdmin ? () => setIsDeleteConfirmOpen(true) : undefined}
          primaryLabel="Save changes"
          secondaryLabel="Cancel"
        />
      )}
      {/* Delete team member confirmation (admin only) */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>
              Delete {memberUserData ? `${memberUserData.firstName} ${memberUserData.lastName ?? ""}`.trim() || "this member" : "this member"}?
            </DialogTitle>
            <DialogDescription>This action can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false} className="sm:justify-start">
            <Button variant="secondary" size="lg" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="lg" onClick={handleConfirmDeleteFromModal}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isUserDetailModalOpen && loadingMemberData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.36]" aria-hidden="true">
          <p className="text-sm text-muted-foreground bg-background px-4 py-2 rounded-lg">Loading...</p>
        </div>
      )}
    </MainTemplate>
  )
}
