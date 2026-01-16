"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ViewTemplate, useViewSections } from "@/components/custom/templates/view-template"
import { EntityBasicInformationForm } from "@/components/custom/entity-basic-information-form"
import { SelfPhotographerForm } from "@/components/custom/self-photographer-form"
import { UserCreationForm } from "@/components/custom/user-creation-form"
import { ModalWindow } from "@/components/custom/modal-window"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { createEntityDetailService, EntityNotFoundError, createEntityCreationService } from "@/lib/services"
import type { EntityType, StandardEntityType, CreateEntityDraftPayload } from "@/lib/types"
import { entityTypeToLabel, entityRequiresLocation, roleToLabel } from "@/lib/types"
import { mapEntityToFormData, mapSelfPhotographerToFormData, mapFormToEntityDraft, mapFormToUserPayload, mapSelfPhotographerFormToEntityDraft } from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import type { SelfPhotographerFormData } from "@/components/custom/self-photographer-creation-form"
import { formatDistanceToNow } from "date-fns"

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function EntityDetailPage() {
  const params = useParams()
  const router = useRouter()
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
  const permission = "admin" // TODO: Get from auth context
  const canEdit = permission === "admin" || permission === "editor"

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
      const service = createEntityCreationService()
      let draft: CreateEntityDraftPayload

      // Handle self-photographer vs standard entities
      if (entity.entity.type === "self-photographer") {
        if (!selfPhotographerFormData) {
          return
        }
        draft = mapSelfPhotographerFormToEntityDraft(selfPhotographerFormData)
      } else {
        if (!basicFormData) {
          return
        }
        draft = mapFormToEntityDraft(basicFormData)
      }
      
      // Ensure type matches existing entity (cannot change type)
      draft.type = entity.entity.type

      const result = await service.updateEntityBasicInfo(entityId, draft)
      
      // Refresh entity data
      const updatedData = await fetchEntityData()
      setEntity(updatedData)
      
      toast.success("Entity information updated", {
        description: `${result.entity.name} has been updated successfully.`,
      })
    } catch (error) {
      console.error("Failed to update entity:", error)
      toast.error("Failed to update entity", {
        description: error instanceof Error ? error.message : "An error occurred while updating the entity.",
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
    setIsNewMemberModalOpen(true)
  }, [])

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
  }) => {
    if (!entityId) return

    setIsCreatingMember(true)
    try {
      const service = createEntityCreationService()
      // Convert to UserFormData format (entity type must be StandardEntityType for UserFormData)
      // Since we're adding a member to an existing entity, we know it's not self-photographer
      const userFormData = {
        ...userData,
        entity: userData.entity && userData.entity.type !== "self-photographer"
          ? { type: userData.entity.type as StandardEntityType, name: userData.entity.name }
          : null,
      }
      const payload = mapFormToUserPayload(userFormData)

      const result = await service.addTeamMember(entityId, payload)
      
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
          No entity data available
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
            actionDisabled={!canEdit}
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
  }, [entity, canEdit, handleOpenNewMemberModal])

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
      collections: 0, // TODO: Fetch collections count when available
      lastUpdate,
      entity: entity.entity,
      teamMembersList: entity.teamMembers.length > 0 ? entity.teamMembers : undefined,
      collectionsList: undefined, // TODO: Fetch collections when available
      adminUser: entity.adminUser,
    }
  }, [entity])

  // Missing entityId state
  if (!entityId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Invalid entity ID</h1>
          <p className="text-sm text-muted-foreground">
            The entity ID is missing from the URL.
          </p>
          <button
            onClick={() => router.push("/entities")}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:underline"
          >
            Back to Entities
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading entity...</p>
      </div>
    )
  }

  // Not found state
  if (notFound || !entity) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">Entity not found</h1>
          <p className="text-sm text-muted-foreground">
            The entity you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/entities")}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:underline"
          >
            Back to Entities
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
          { label: "Home", href: "/" },
          { label: "Entities", href: "/entities" },
          { label: entity.entity.name },
        ]}
        sections={sections}
        entity={viewEntityData}
        permission={permission}
        defaultActiveSection="basic"
        onSectionChange={(sectionId) => {
          // Optional: handle section changes
          console.log("Section changed:", sectionId)
        }}
        onDelete={() => {
          // TODO: Handle delete
          console.log("Delete clicked")
        }}
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
        <ModalWindow
          open={isNewMemberModalOpen}
          onOpenChange={setIsNewMemberModalOpen}
          title="New member"
          subtitle="Add a new team member to this entity"
        >
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
        </ModalWindow>
      )}
    </>
  )
}
