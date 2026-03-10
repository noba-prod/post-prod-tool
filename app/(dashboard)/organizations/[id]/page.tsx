"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ViewTemplate, useViewSections } from "@/components/custom/templates/view-template"
import { EntityBasicInformationForm } from "@/components/custom/entity-basic-information-form"
import { SelfPhotographerForm } from "@/components/custom/self-photographer-form"
import { UserCreationForm } from "@/components/custom/user-creation-form"
import { ModalWindow } from "@/components/custom/modal-window"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { createEntityDetailService, EntityNotFoundError } from "@/lib/services"
import type { EntityType, StandardEntityType } from "@/lib/types"
import { entityTypeToLabel, entityRequiresLocation, roleToLabel } from "@/lib/types"
import { useUserContext } from "@/lib/contexts/user-context"
import { mapEntityToFormData, mapSelfPhotographerToFormData, mapFormToUserPayload, mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import type { SelfPhotographerFormData } from "@/components/custom/self-photographer-creation-form"
import { formatDistanceToNow } from "date-fns"

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userContext = useUserContext()
  const entityId = params?.id as string | undefined

  // State
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [entity, setEntity] = React.useState<Awaited<ReturnType<typeof fetchEntityData>> | null>(null)
  
  // Form state for Basic Information
  const [basicFormData, setBasicFormData] = React.useState<EntityBasicInformationFormData | null>(null)
  const [selfPhotographerFormData, setSelfPhotographerFormData] = React.useState<SelfPhotographerFormData | null>(null)
  const [isBasicInfoValid, setIsBasicInfoValid] = React.useState(false)
  const [isSavingBasicInfo, setIsSavingBasicInfo] = React.useState(false)
  
  // Modal state for creating team member
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = React.useState(false)
  const [isCreatingMember, setIsCreatingMember] = React.useState(false)
  
  // Modal state for editing user
  const [isEditUserModalOpen, setIsEditUserModalOpen] = React.useState(false)
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null)
  const [isUpdatingUser, setIsUpdatingUser] = React.useState(false)

  // Delete entity confirmation dialog
  const [isDeleteEntityDialogOpen, setIsDeleteEntityDialogOpen] = React.useState(false)
  const [isDeletingEntity, setIsDeletingEntity] = React.useState(false)

  // Fetch entity data
  const fetchEntityData = React.useCallback(async () => {
    if (!entityId) return null

    try {
      const service = createEntityDetailService()
      const result = await service.getEntityWithTeamMembers(entityId)
      return result
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        setNotFound(true)
        return null
      }
      console.error("Failed to fetch entity:", error)
      return null
    }
  }, [entityId])

  // Load data on mount
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setNotFound(false)
      const data = await fetchEntityData()
      setEntity(data)
      setLoading(false)
    }
    loadData()
  }, [fetchEntityData])

  // Permission (for form disabled state)
  // Get from user context - viewers cannot create or edit
  const userRole = userContext.user?.role || "admin"
  const canEdit = userRole === "admin" || userRole === "editor"
  const canCreate = userRole === "admin" || userRole === "editor" // viewers cannot create

  // =============================================================================
  // HANDLERS: Basic Information
  // =============================================================================

  // Handle form data changes (for standard entities)
  const handleBasicFormDataChange = React.useCallback((data: EntityBasicInformationFormData) => {
    setBasicFormData(data)
  }, [])

  // Handle form data changes (for self-photographer)
  const handleSelfPhotographerFormDataChange = React.useCallback((data: SelfPhotographerFormData) => {
    setSelfPhotographerFormData(data)
  }, [])

  // Handle form validation changes
  const handleBasicValidationChange = React.useCallback((isValid: boolean) => {
    setIsBasicInfoValid(isValid)
  }, [])

  // Handle save basic information
  const handleSaveBasicInfo = React.useCallback(async () => {
    if (!entityId || !entity?.entity || !isBasicInfoValid) {
      return
    }

    setIsSavingBasicInfo(true)
    try {
      let profilePictureUrl: string | undefined
      if (entity.entity.type !== "self-photographer" && basicFormData?.profilePicture) {
        const formData = new FormData()
        formData.append("file", basicFormData.profilePicture)
        const uploadRes = await fetch(`/api/organizations/${entityId}/profile-picture`, {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
        profilePictureUrl = uploadData.profilePictureUrl
      }

      let payload: {
        name?: string
        email?: string
        phoneNumber?: string
        countryCode?: string
        profilePictureUrl?: string
        notes?: string
        location?: {
          streetAddress?: string
          zipCode?: string
          city?: string
          country?: string
        }
      } = {}

      if (entity.entity.type === "self-photographer") {
        if (!selfPhotographerFormData) {
          return
        }
        payload = {
          name: `${selfPhotographerFormData.firstName} ${selfPhotographerFormData.lastName || ""}`.trim(),
          email: selfPhotographerFormData.email.trim() || undefined,
          phoneNumber: selfPhotographerFormData.phoneNumber.trim(),
          countryCode: selfPhotographerFormData.countryCode,
          notes: selfPhotographerFormData.notes.trim() || undefined,
        }
      } else {
        if (!basicFormData) {
          return
        }
        payload = {
          name: basicFormData.entityName.trim(),
          email: basicFormData.email.trim() || undefined,
          phoneNumber: basicFormData.phoneNumber.trim(),
          countryCode: basicFormData.countryCode,
          notes: basicFormData.notes.trim() || undefined,
          location: {
            streetAddress: basicFormData.streetAddress.trim(),
            zipCode: basicFormData.zipCode.trim(),
            city: basicFormData.city.trim(),
            country: basicFormData.country.trim(),
          },
        }
        if (profilePictureUrl) {
          payload.profilePictureUrl = profilePictureUrl
        }
      }

      const response = await fetch(`/api/organizations/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string }
        throw new Error(errorBody.error || "Failed to update organization")
      }

      const result = (await response.json()) as { entity: import("@/lib/types").Entity }

      // Refresh entity data
      const updatedData = await fetchEntityData()
      setEntity(updatedData)
      
      toast.success("Organization information updated", {
        description: `${result.entity.name} has been updated successfully.`,
      })
    } catch (error) {
      console.error("Failed to update organization:", error)
      toast.error("Failed to update organization", {
        description: error instanceof Error ? error.message : "An error occurred while updating the organization.",
      })
    } finally {
      setIsSavingBasicInfo(false)
    }
  }, [entityId, entity, basicFormData, selfPhotographerFormData, isBasicInfoValid, fetchEntityData])

  // =============================================================================
  // HANDLERS: Team Members
  // =============================================================================

  // Handle open new member modal
  const handleOpenNewMemberModal = React.useCallback(() => {
    console.log("handleOpenNewMemberModal called, entityId:", entityId)
    if (!entityId) {
      toast.error("Cannot add member", {
        description: "Organization must be loaded before adding team members.",
      })
      return
    }
    setIsNewMemberModalOpen(true)
  }, [entityId])

  // Handle close new member modal
  const handleCloseNewMemberModal = React.useCallback(() => {
    setIsNewMemberModalOpen(false)
  }, [])

  // Handle create new team member
  const handleCreateTeamMember = React.useCallback(async (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    entity: { type: EntityType; name: string } | null
    role: "admin" | "editor" | "viewer"
    profilePicture?: File | null
  }) => {
    if (!entityId) return

    setIsCreatingMember(true)
    try {
      // Convert to UserFormData format (entity type must be StandardEntityType for UserFormData)
      // Since we're adding a member to an existing entity, we know it's not self-photographer
      const userFormData = {
        ...userData,
        entity: userData.entity && userData.entity.type !== "self-photographer"
          ? { type: userData.entity.type as StandardEntityType, name: userData.entity.name }
          : null,
      }
      const payload = mapFormToUserPayload(userFormData)
      const response = await fetch(`/api/organizations/${entityId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string }
        throw new Error(errorBody.error || "Failed to create team member")
      }

      const result = (await response.json()) as { user: import("@/lib/types").User }
      const createdUserId = result.user.id

      // Upload profile picture if provided (user must exist first)
      if (userData.profilePicture && createdUserId) {
        const formData = new FormData()
        formData.append("file", userData.profilePicture)
        const uploadRes = await fetch(`/api/users/${createdUserId}/profile-picture`, {
          method: "POST",
          body: formData,
        })
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}))
          throw new Error(uploadData.error ?? "Failed to upload profile picture")
        }
      }

      // Refresh entity data
      const updatedData = await fetchEntityData()
      setEntity(updatedData)
      
      // Close modal
      setIsNewMemberModalOpen(false)
      
      toast.success("Team member created", {
        description: `${result.user.firstName} ${result.user.lastName || ""}`.trim() + " has been added to the team.",
      })
    } catch (error) {
      console.error("Failed to create team member:", error)
      toast.error("Failed to create team member", {
        description: error instanceof Error ? error.message : "An error occurred while creating the team member.",
      })
    } finally {
      setIsCreatingMember(false)
    }
  }, [entityId, fetchEntityData])

  // Handle edit user (team member)
  const handleEditUser = React.useCallback((userId: string) => {
    console.log("handleEditUser called, userId:", userId)
    if (!userId) {
      console.error("handleEditUser: userId is missing")
      return
    }
    setEditingUserId(userId)
    setIsEditUserModalOpen(true)
  }, [])

  // Handle close edit user modal
  const handleCloseEditUserModal = React.useCallback(() => {
    setIsEditUserModalOpen(false)
    setEditingUserId(null)
  }, [])

  // Handle update user
  const handleUpdateUser = React.useCallback(async (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    entity: { type: EntityType; name: string } | null
    role: "admin" | "editor" | "viewer"
    profilePicture?: File | null
  }) => {
    if (!editingUserId || !entityId) return

    setIsUpdatingUser(true)
    try {
      let profilePictureUrl: string | undefined
      if (userData.profilePicture) {
        const formData = new FormData()
        formData.append("file", userData.profilePicture)
        const uploadRes = await fetch(`/api/users/${editingUserId}/profile-picture`, {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
        profilePictureUrl = uploadData.profilePictureUrl
      }
      // Convert to UserFormData format (entity type must be StandardEntityType for UserFormData)
      // Since we're editing a team member, we know the entity is not self-photographer
      const userFormData: import("@/lib/utils/form-mappers").UserFormData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        entity: userData.entity && userData.entity.type !== "self-photographer"
          ? { type: userData.entity.type as StandardEntityType, name: userData.entity.name }
          : null,
        role: userData.role,
      }
      const payload = mapFormToUpdateUserPayload(userFormData, profilePictureUrl)
      const response = await fetch(`/api/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string }
        throw new Error(errorBody.error || "Failed to update user")
      }
      
      // Refresh entity data
      const updatedData = await fetchEntityData()
      setEntity(updatedData)
      
      // Close modal
      setIsEditUserModalOpen(false)
      setEditingUserId(null)
      
      toast.success("User updated successfully", {
        description: `${userData.firstName} ${userData.lastName || ""}`.trim() + " has been updated.",
      })
    } catch (error) {
      console.error("Failed to update user:", error)
      toast.error("Failed to update user", {
        description: error instanceof Error ? error.message : "An error occurred while updating the user.",
      })
    } finally {
      setIsUpdatingUser(false)
    }
  }, [editingUserId, entityId, fetchEntityData])

  // Build form initial data based on entity type
  const basicFormInitialData = React.useMemo(() => {
    if (!entity?.entity) return undefined

    if (entity.entity.type === "self-photographer") {
      // For self-photographer, use SelfPhotographerFormData
      if (!entity.adminUser) return undefined
      try {
        return mapSelfPhotographerToFormData(entity.entity, entity.adminUser)
      } catch {
        return undefined
      }
    } else {
      // For standard entities, use EntityBasicInformationFormData
      try {
        return mapEntityToFormData(entity.entity)
      } catch {
        return undefined
      }
    }
  }, [entity])

  // Build basic section content based on entity type
  const basicSectionContent = React.useMemo(() => {
    if (!entity?.entity) {
      return (
        <div className="w-full py-12 text-center text-muted-foreground">
          No organization data available
        </div>
      )
    }

    const entityType = entity.entity.type

    if (entityType === "self-photographer") {
      // Guard: self-photographer needs admin user
      if (!entity.adminUser) {
        return (
          <div className="w-full py-12 text-center text-muted-foreground">
            Admin user data not available
          </div>
        )
      }

      return (
        <SelfPhotographerForm
          initialData={basicFormInitialData}
          disabled={!canEdit}
          onDataChange={handleSelfPhotographerFormDataChange}
          onValidationChange={handleBasicValidationChange}
        />
      )
    } else {
      const entityTypeForForm = entityType as StandardEntityType
      return (
        <EntityBasicInformationForm
          entityType={entityTypeForForm}
          initialData={basicFormInitialData}
          existingProfilePictureUrl={entity.entity.profilePictureUrl}
          showLocation={entityRequiresLocation(entityTypeForForm)}
          disabled={!canEdit}
          onDataChange={handleBasicFormDataChange}
          onValidationChange={handleBasicValidationChange}
        />
      )
    }
  }, [entity, basicFormInitialData, canEdit, handleBasicFormDataChange, handleBasicValidationChange, handleSelfPhotographerFormDataChange])

  // Build team section content with handler
  const teamSectionContent = React.useMemo(() => {
    if (!entity?.entity || entity.entity.type === "self-photographer") {
      return null // Self-photographer doesn't have team members section
    }

    const teamMembersData = entity.teamMembers.map((member) => ({
      id: member.id,
      name: `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`.trim(),
      email: member.email,
      phone: member.phoneNumber,
      role: roleToLabel(member.role) as "Admin" | "Editor" | "Viewer",
      collections: 0,
    }))

    return (
      <Layout padding="none" showSeparators={false}>
        {/* First row: Filter Bar */}
        <LayoutSection>
          <FilterBar
            variant="members"
            searchPlaceholder="Search members..."
            onActionClick={handleOpenNewMemberModal}
            actionDisabled={!canCreate}
          />
        </LayoutSection>

        {/* Second row: Team Members Table */}
        <LayoutSection>
          {teamMembersData.length > 0 ? (
            <Tables
              variant="team-members"
              teamMembersData={teamMembersData}
              onDelete={(id) => {
                // TODO: Handle delete member
                console.log("Delete member:", id)
              }}
              onEditUser={handleEditUser}
              canDelete={canEdit}
            />
          ) : (
            <div className="w-full py-12 text-center text-muted-foreground">
              No team members yet
            </div>
          )}
        </LayoutSection>
      </Layout>
    )
  }, [entity, canEdit, handleOpenNewMemberModal, handleEditUser])

  // Build sections with content
  const sections = useViewSections(
    {
      basic: basicSectionContent,
      team: teamSectionContent,
      // collections: undefined, // Will auto-render FilterBar + Grid/Table if no content
    },
    {
      basic: {
        onPrimaryClick: handleSaveBasicInfo,
        showPrimaryAction: true,
        primaryDisabled: !isBasicInfoValid || isSavingBasicInfo,
        primaryLabel: isSavingBasicInfo ? "Saving..." : "Save changes",
      },
    }
  )

  // Delete entity: confirm then call API and redirect
  const handleConfirmDeleteEntity = React.useCallback(async () => {
    if (!entityId || !entity?.entity) return
    setIsDeletingEntity(true)
    try {
      const res = await fetch(`/api/organizations/${entityId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete organization")
      }
      setIsDeleteEntityDialogOpen(false)
      toast.success("Organization deleted", {
        description: `${entity.entity.name} has been deleted.`,
      })
      router.push("/organizations")
    } catch (error) {
      console.error("Delete entity error:", error)
      toast.error("Failed to delete organization", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      })
    } finally {
      setIsDeletingEntity(false)
    }
  }, [entityId, entity?.entity, router])

  // Map entity data to ViewEntityData
  const viewEntityData = React.useMemo(() => {
    if (!entity) {
      return {
        name: "Loading...",
        type: undefined,
        rawType: undefined,
        teamMembers: 0,
        collections: 0,
        lastUpdate: undefined,
      }
    }

    // Calculate relative time from updatedAt
    const lastUpdate = entity.entity.updatedAt
      ? formatDistanceToNow(entity.entity.updatedAt, { addSuffix: true })
      : "just now"

    return {
      name: entity.entity.name,
      type: entityTypeToLabel(entity.entity.type),
      rawType: entity.entity.type,
      teamMembers: entity.teamMembers.length,
      collections: entity.collectionsList?.length ?? 0,
      lastUpdate,
      entity: entity.entity,
      teamMembersList: entity.teamMembers.length > 0 ? entity.teamMembers : undefined,
      collectionsList: entity.collectionsList?.length ? entity.collectionsList : undefined,
      adminUser: entity.adminUser,
    }
  }, [entity])

  // Missing entityId state
  if (!entityId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Invalid organization ID</h1>
          <p className="text-sm text-muted-foreground">
            The organization ID is missing from the URL.
          </p>
          <button
            onClick={() => router.push("/organizations")}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:underline"
          >
            Back to Players
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading organization...</p>
      </div>
    )
  }

  // Not found state
  if (notFound || !entity) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Organization not found</h1>
          <p className="text-sm text-muted-foreground">
            The organization you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/organizations")}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:underline"
          >
            Back to Players
          </button>
        </div>
      </div>
    )
  }

  // Render ViewTemplate
  return (
    <>
      <ViewTemplate
        breadcrumbs={[
          { label: "Players", href: "/organizations" },
          { label: entity.entity.name },
        ]}
        sections={sections}
        entity={viewEntityData}
        permission={userRole}
        defaultActiveSection="basic"
        onSectionChange={(sectionId) => {
          // Optional: handle section changes
          console.log("Section changed:", sectionId)
        }}
        onDelete={() => setIsDeleteEntityDialogOpen(true)}
        navBarProps={{
          variant: "noba",
          userName: "Martin Becerra",
          organization: "noba",
          role: "admin",
          isAdmin: true,
        }}
      />

      {/* New Member Modal */}
      {entity?.entity && (
        <UserCreationForm
          open={isNewMemberModalOpen}
          onOpenChange={setIsNewMemberModalOpen}
          entity={{
            type: entity.entity.type,
            name: entity.entity.name,
          }}
          isAdminUser={false}
          primaryLabel="Register member"
          onSubmit={handleCreateTeamMember}
          onCancel={handleCloseNewMemberModal}
        />
      )}

      {/* Edit User Modal */}
      {entity?.entity && editingUserId && (
        <UserCreationForm
          open={isEditUserModalOpen}
          onOpenChange={handleCloseEditUserModal}
          mode="edit"
          entity={{
            type: entity.entity.type,
            name: entity.entity.name,
          }}
          initialUserData={entity.teamMembers.find((u) => u.id === editingUserId) || undefined}
          disabled={!canEdit}
          onSubmit={handleUpdateUser}
          onCancel={handleCloseEditUserModal}
        />
      )}

      {/* Delete Entity confirmation dialog */}
      <Dialog open={isDeleteEntityDialogOpen} onOpenChange={setIsDeleteEntityDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none">
              <span className="text-primary">Delete </span>
              <span className="text-lime-500">
                @{(entity?.entity?.name ?? "organization").toLowerCase().replace(/\s+/g, "")}
              </span>
            </DialogTitle>
            <DialogDescription>
              This action can&apos;t be undone. If you delete this{" "}
              {entity?.entity?.type ? entityTypeToLabel(entity.entity.type) : "organization"}
              , it might affect other collections in progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteEntityDialogOpen(false)}
              disabled={isDeletingEntity}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteEntity}
              disabled={isDeletingEntity}
            >
              {isDeletingEntity ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
