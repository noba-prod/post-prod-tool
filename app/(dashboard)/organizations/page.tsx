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
import { UserCreationForm } from "@/components/custom/user-creation-form"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import type { Entity } from "@/components/custom/tables"
import { useUserContext } from "@/lib/contexts/user-context"

// Service imports
import { createEntitiesListService, createEntityCreationService } from "@/lib/services"
import { getRepositoryInstances } from "@/lib/services/factories/entity-creation-service.factory"
import { mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"

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
// ORGANIZATION OPTIONS (excludes Collection for organizations page)
// ============================================================================

const ORGANIZATIONS_PAGE_OPTIONS: Array<"client" | "self-photographer" | "agency" | "photo-lab" | "edition-studio" | "hand-print-lab"> = [
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

export default function OrganizationsPage() {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const userContext = useUserContext()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Organizations data from repository
  const [entities, setEntities] = useState<Entity[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    type: null,
    search: "",
  })

  // Modal state for editing admin user
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false)
  const [editingAdminUserId, setEditingAdminUserId] = useState<string | null>(null)
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null)
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false)
  const [editingUserData, setEditingUserData] = useState<import("@/lib/types").User | null>(null)
  const [editingEntityData, setEditingEntityData] = useState<import("@/lib/types").Entity | null>(null)
  const [loadingEditData, setLoadingEditData] = useState(false)

  // Permission (for form disabled state)
  const userRole = userContext.user?.role || "admin"
  const canEdit = userRole === "admin" || userRole === "editor"
  const canCreate = userRole === "admin" || userRole === "editor"

  // Load organizations from repository (exclude noba* — product owners)
  const loadEntities = useCallback(async () => {
    setLoadingEntities(true)
    try {
      const service = createEntitiesListService()
      const items = await service.listEntities()
      
      const mappedEntities: Entity[] = items
        .filter((item) => item.name?.trim() !== "noba*")
        .map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type as Entity["type"],
          admin: item.admin,
          adminUserId: item.adminUserId,
          teamMembers: item.teamMembers,
          collections: item.collections,
        }))
      
      setEntities(mappedEntities)
    } catch (error) {
      console.error("Failed to load organizations:", error)
    } finally {
      setLoadingEntities(false)
    }
  }, [])

  // Route guard: Check if user can access Organizations section
  useEffect(() => {
    if (!userContext.loading && !userContext.canAccessEntities) {
      toast.error("Access Denied", {
        description: "You don't have access to the Organizations section. Only noba users can access this page.",
      })
      router.push("/collections")
    }
  }, [userContext.loading, userContext.canAccessEntities, router])

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
      
      if (userContext.canAccessEntities) {
        loadEntities()
      }
      
      const pendingToast = consumePendingToast()
      if (pendingToast) {
        if (pendingToast.type === "success") {
          toast.success(pendingToast.title, { description: pendingToast.description })
        } else {
          toast.error(pendingToast.title, { description: pendingToast.description })
        }
      }
    }
    checkSession()
  }, [router, authAdapter, loadEntities, userContext.canAccessEntities])

  const handleFilterChange = (filterId: string, value: string) => {
    if (filterId === "type") {
      setFilters(prev => ({ ...prev, type: prev.type === value ? null : value }))
    }
  }

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  const handleViewDetails = (id: string) => {
    router.push(`/organizations/${id}`)
  }

  const handleEditAdminUser = useCallback(async (userId: string, entityId: string) => {
    setEditingAdminUserId(userId)
    setEditingEntityId(entityId)
    setIsEditAdminModalOpen(true)
    setLoadingEditData(true)
    
    try {
      const { userRepository, entityRepository } = getRepositoryInstances()
      if (!userRepository || !entityRepository) {
        toast.error("Failed to load repositories", { description: "Repository instances are not available." })
        setIsEditAdminModalOpen(false)
        return
      }

      const [user, entity] = await Promise.all([
        userRepository.getUserById(userId),
        entityRepository.getEntityById(entityId),
      ])

      if (!user || !entity) {
        toast.error("Failed to load user data", { description: "The user or organization could not be found." })
        setIsEditAdminModalOpen(false)
        setEditingAdminUserId(null)
        setEditingEntityId(null)
        return
      }

      setEditingUserData(user)
      setEditingEntityData(entity)
    } catch (error) {
      console.error("Failed to fetch user/organization data:", error)
      toast.error("Failed to load data", {
        description: error instanceof Error ? error.message : "An error occurred while loading user data.",
      })
      setIsEditAdminModalOpen(false)
      setEditingAdminUserId(null)
      setEditingEntityId(null)
    } finally {
      setLoadingEditData(false)
    }
  }, [])

  const handleCloseEditAdminModal = useCallback(() => {
    setIsEditAdminModalOpen(false)
    setEditingAdminUserId(null)
    setEditingEntityId(null)
    setEditingUserData(null)
    setEditingEntityData(null)
  }, [])

  const handleUpdateAdminUser = useCallback(async (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    entity: { type: import("@/lib/types").EntityType; name: string } | null
    role: "admin" | "editor" | "viewer"
    profilePicture?: File | null
  }) => {
    if (!editingAdminUserId) return

    setIsUpdatingAdmin(true)
    try {
      let profilePictureUrl: string | undefined
      if (userData.profilePicture) {
        const formData = new FormData()
        formData.append("file", userData.profilePicture)
        const uploadRes = await fetch(`/api/users/${editingAdminUserId}/profile-picture`, {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
        profilePictureUrl = uploadData.profilePictureUrl
      }
      const service = createEntityCreationService()
      const userFormData: import("@/lib/utils/form-mappers").UserFormData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        entity: userData.entity && userData.entity.type !== "self-photographer"
          ? { type: userData.entity.type as import("@/lib/types").StandardEntityType, name: userData.entity.name }
          : null,
        role: userData.role,
      }
      const payload = mapFormToUpdateUserPayload(userFormData, profilePictureUrl)
      await service.updateUser(editingAdminUserId, payload)
      await loadEntities()
      setIsEditAdminModalOpen(false)
      setEditingAdminUserId(null)
      setEditingEntityId(null)
      toast.success("User updated successfully", {
        description: `${userData.firstName} ${userData.lastName || ""}`.trim() + " has been updated.",
      })
    } catch (error) {
      console.error("Failed to update admin user:", error)
      toast.error("Failed to update user", {
        description: error instanceof Error ? error.message : "An error occurred while updating the user.",
      })
    } finally {
      setIsUpdatingAdmin(false)
    }
  }, [editingAdminUserId, loadEntities])

  const handleEntityCreated = useCallback(() => {
    loadEntities()
  }, [loadEntities])

  const filteredEntities = React.useMemo(() => {
    let result = [...entities]
    if (filters.type) {
      result = result.filter(e => (e.type ?? "").toLowerCase().replace(/\s+/g, "-") === filters.type)
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(e =>
        (e.name ?? "").toLowerCase().includes(searchLower) ||
        (e.type ?? "").toLowerCase().includes(searchLower) ||
        (e.admin ?? "").toLowerCase().includes(searchLower)
      )
    }
    return result
  }, [entities, filters])

  if (loading || userContext.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!userContext.canAccessEntities) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    )
  }

  if (!session) return null

  return (
    <MainTemplate title="Organizations">
      <Layout padding="none" showSeparators={false}>
        <LayoutSection>
          <div className="flex items-center justify-between w-full h-10">
            <div className="flex-1">
              <FilterBar
                variant="entities"
                onSearchChange={handleSearchChange}
                onFilterChange={handleFilterChange}
                searchPlaceholder="Search organizations..."
                showAction={false}
              />
            </div>
            <CreateEntityCommand
              allowedOptions={ORGANIZATIONS_PAGE_OPTIONS}
              buttonLabel="New organization"
              popoverAlign="end"
              redirectAfterCreate={false}
              onCreated={handleEntityCreated}
              disabled={!canCreate}
            />
          </div>
        </LayoutSection>
        <LayoutSection>
          {loadingEntities ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">Loading organizations...</p>
            </div>
          ) : (
            <>
              <Tables
                variant="entities"
                entitiesData={filteredEntities}
                onViewDetails={handleViewDetails}
                onEditAdminUser={handleEditAdminUser}
              />
              {filteredEntities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium text-muted-foreground">No organizations found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {entities.length === 0
                      ? "Create your first organization to get started"
                      : "Try adjusting your filters"}
                  </p>
                </div>
              )}
            </>
          )}
        </LayoutSection>
      </Layout>

      {isEditAdminModalOpen && editingAdminUserId && editingEntityId && editingUserData && editingEntityData && (
        <UserCreationForm
          open={isEditAdminModalOpen}
          onOpenChange={handleCloseEditAdminModal}
          mode="edit"
          entity={{ type: editingEntityData.type, name: editingEntityData.name }}
          initialUserData={editingUserData}
          disabled={!canEdit}
          onSubmit={handleUpdateAdminUser}
          onCancel={handleCloseEditAdminModal}
        />
      )}
    </MainTemplate>
  )
}
